//! The token-owning API client. The webview only ever gets an HTTP status and Kirana-B's
//! envelope with token fields removed: access token in memory, refresh token in the OS store.

use serde::Serialize;
use serde_json::{json, Value};
use std::future::Future;
use std::sync::Mutex;

pub const DEVICE_NAME: &str = "Desktop POS";
const METHODS: [&str; 5] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
/// These routes carry tokens; only the dedicated commands call them.
const TOKEN_ROUTES: [&str; 3] = ["/auth/login", "/auth/refresh", "/auth/logout"];

/// What a command returns to the webview. `status` 0 means the server could not be reached.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Reply {
    pub status: u16,
    pub body: Value,
}

impl Reply {
    fn local(status: u16, message: &str) -> Self {
        Self { status, body: json!({ "status": false, "message": message }) }
    }

    fn is_success(&self) -> bool {
        (200..300).contains(&self.status)
    }
}

pub trait Http: Send + Sync {
    /// Err only when no HTTP response arrived (offline, DNS, timeout).
    fn send(
        &self,
        method: &str,
        url: &str,
        bearer: Option<&str>,
        body: Option<&Value>,
    ) -> impl Future<Output = Result<Reply, String>> + Send;
}

pub trait Secrets: Send + Sync {
    fn load(&self) -> Option<String>;
    fn save(&self, token: &str);
    fn clear(&self);
}

pub struct Session<H, S> {
    http: H,
    secrets: S,
    base: String,
    access: Mutex<Option<String>>,
    refresh_gate: tokio::sync::Mutex<()>,
}

impl<H: Http, S: Secrets> Session<H, S> {
    pub fn new(http: H, secrets: S, base: &str) -> Self {
        Self {
            http,
            secrets,
            base: base.trim_end_matches('/').to_string(),
            access: Mutex::new(None),
            refresh_gate: tokio::sync::Mutex::new(()),
        }
    }

    /// POST /auth/login. Keeps the tokens, returns the envelope without them (409 lists businesses).
    pub async fn login(&self, identifier: &str, password: &str, kirana_id: Option<&str>) -> Reply {
        let mut body =
            json!({ "identifier": identifier, "password": password, "deviceName": DEVICE_NAME });
        if let Some(id) = kirana_id {
            body["kiranaId"] = json!(id);
        }
        let reply = self.send("POST", "/auth/login", None, Some(&body)).await;
        if reply.is_success() {
            if let Some((access, refresh)) = tokens(&reply.body) {
                self.secrets.save(&refresh);
                self.set_access(Some(access));
            }
        }
        strip_tokens(reply)
    }

    /// On start: refresh from the stored token, then GET /auth/me. No stored token, no network.
    pub async fn restore(&self) -> Reply {
        if self.access().is_none() && !self.refresh(None).await {
            return Reply::local(401, "Not signed in");
        }
        strip_tokens(self.authed("GET", "/auth/me", None).await)
    }

    /// Revokes the server session (best effort, so it also works offline), then forgets it.
    pub async fn logout(&self) {
        let _gate = self.refresh_gate.lock().await;
        if let Some(token) = self.secrets.load() {
            let body = json!({ "refreshToken": token });
            self.send("POST", "/auth/logout", None, Some(&body)).await;
        }
        self.secrets.clear();
        self.set_access(None);
    }

    /// Any other API call from the webview.
    pub async fn request(&self, method: &str, path: &str, body: Option<Value>) -> Reply {
        let allowed = METHODS.contains(&method)
            && route_of(path).is_some_and(|route| !TOKEN_ROUTES.contains(&route.as_str()));
        if !allowed {
            return Reply::local(400, "Request not allowed");
        }
        strip_tokens(self.authed(method, path, body.as_ref()).await)
    }

    /// Sends with the access token; on 401 refreshes once and retries once.
    async fn authed(&self, method: &str, path: &str, body: Option<&Value>) -> Reply {
        let token = self.access();
        let reply = self.send(method, path, token.as_deref(), body).await;
        if reply.status != 401 || !self.refresh(token.as_deref()).await {
            return reply;
        }
        let token = self.access();
        self.send(method, path, token.as_deref(), body).await
    }

    /// Single flight: Kirana-B rotates refresh tokens and revokes the session when one is
    /// reused, so concurrent 401s must not each send the same refresh token.
    async fn refresh(&self, stale: Option<&str>) -> bool {
        let _gate = self.refresh_gate.lock().await;
        let current = self.access();
        if current.is_some() && current.as_deref() != stale {
            return true; // another request refreshed while this one waited
        }
        let Some(token) = self.secrets.load() else {
            return false;
        };
        let body = json!({ "refreshToken": token });
        let reply = self.send("POST", "/auth/refresh", None, Some(&body)).await;
        if reply.is_success() {
            if let Some((access, refresh)) = tokens(&reply.body) {
                self.secrets.save(&refresh);
                self.set_access(Some(access));
                return true;
            }
        }
        if matches!(reply.status, 400 | 401 | 403) {
            // The server rejected the token: this session is over. Offline or 5xx keeps it.
            self.secrets.clear();
            self.set_access(None);
        }
        false
    }

    async fn send(&self, method: &str, path: &str, bearer: Option<&str>, body: Option<&Value>) -> Reply {
        let url = format!("{}{}", self.base, path);
        self.http
            .send(method, &url, bearer, body)
            .await
            .unwrap_or_else(|_| Reply::local(0, "Could not reach the KiranaOS server"))
    }

    fn access(&self) -> Option<String> {
        self.access.lock().unwrap().clone()
    }

    fn set_access(&self, token: Option<String>) {
        *self.access.lock().unwrap() = token;
    }
}

fn tokens(body: &Value) -> Option<(String, String)> {
    let data = body.get("data")?;
    let access = data.get("accessToken")?.as_str()?.to_string();
    let refresh = data.get("refreshToken")?.as_str()?.to_string();
    Some((access, refresh))
}

fn strip_tokens(mut reply: Reply) -> Reply {
    if let Some(data) = reply.body.get_mut("data").and_then(Value::as_object_mut) {
        data.remove("accessToken");
        data.remove("refreshToken");
    }
    reply
}

/// The normalised route of a safe API path, or None. Routes allow no `%`, `..` or `//`; Express
/// matches routes case-insensitively and ignores a trailing slash, so the result does too.
fn route_of(path: &str) -> Option<String> {
    let (route, query) = path.split_once('?').unwrap_or((path, ""));
    let route_ok = route.starts_with('/')
        && !route.contains("..")
        && !route.contains("//")
        && route.bytes().all(|b| b.is_ascii_alphanumeric() || b"/-_.".contains(&b));
    let query_ok = query.bytes().all(|b| b.is_ascii_graphic() && b != b'#');
    (route_ok && query_ok && path.len() <= 2048)
        .then(|| route.trim_end_matches('/').to_ascii_lowercase())
}

/// Production HTTP: reqwest with a timeout so a dead network never hangs the till.
pub struct ReqwestHttp(reqwest::Client);

impl ReqwestHttp {
    pub fn new() -> reqwest::Result<Self> {
        let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build()?;
        Ok(Self(client))
    }
}

impl Http for ReqwestHttp {
    async fn send(
        &self,
        method: &str,
        url: &str,
        bearer: Option<&str>,
        body: Option<&Value>,
    ) -> Result<Reply, String> {
        let method = reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?;
        let mut request = self.0.request(method, url).header(reqwest::header::ACCEPT, "application/json");
        if let Some(token) = bearer {
            request = request.bearer_auth(token);
        }
        if let Some(json) = body {
            request = request.json(json);
        }
        let response = request.send().await.map_err(|e| e.to_string())?;
        let status = response.status().as_u16();
        let body = response.json::<Value>().await.unwrap_or(Value::Null);
        Ok(Reply { status, body })
    }
}

/// The refresh token in the OS credential store (Windows Credential Manager).
pub struct Keyring;

const KEYRING_SERVICE: &str = "KiranaOS Desktop";
const KEYRING_ACCOUNT: &str = "refresh-token";

impl Secrets for Keyring {
    fn load(&self) -> Option<String> {
        keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).ok()?.get_password().ok()
    }

    fn save(&self, token: &str) {
        let saved = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
            .and_then(|entry| entry.set_password(token));
        if let Err(error) = saved {
            // shortcut: without the OS store the session lasts until the app closes; surface it in the UI if pilots hit it.
            eprintln!("credential store unavailable, session not kept: {error}");
        }
    }

    fn clear(&self) {
        if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT) {
            let _ = entry.delete_credential();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone)]
    struct Call {
        url: String,
        bearer: Option<String>,
        body: Option<Value>,
    }

    type Responder = Box<dyn Fn(&Call) -> Result<Reply, String> + Send + Sync>;

    struct MockHttp {
        calls: Mutex<Vec<Call>>,
        respond: Responder,
    }

    impl Http for MockHttp {
        async fn send(
            &self,
            _method: &str,
            url: &str,
            bearer: Option<&str>,
            body: Option<&Value>,
        ) -> Result<Reply, String> {
            let call = Call {
                url: url.to_string(),
                bearer: bearer.map(String::from),
                body: body.cloned(),
            };
            tokio::task::yield_now().await; // let concurrent requests interleave
            let reply = (self.respond)(&call);
            self.calls.lock().unwrap().push(call);
            reply
        }
    }

    struct MemSecrets(Mutex<Option<String>>);

    impl Secrets for MemSecrets {
        fn load(&self) -> Option<String> {
            self.0.lock().unwrap().clone()
        }
        fn save(&self, token: &str) {
            *self.0.lock().unwrap() = Some(token.to_string());
        }
        fn clear(&self) {
            *self.0.lock().unwrap() = None;
        }
    }

    fn session(
        respond: impl Fn(&Call) -> Result<Reply, String> + Send + Sync + 'static,
        stored: Option<&str>,
    ) -> Session<MockHttp, MemSecrets> {
        let http = MockHttp { calls: Mutex::new(Vec::new()), respond: Box::new(respond) };
        let secrets = MemSecrets(Mutex::new(stored.map(String::from)));
        Session::new(http, secrets, "http://api.test/api/v1/")
    }

    fn ok(data: Value) -> Result<Reply, String> {
        Ok(Reply { status: 200, body: json!({ "status": true, "message": "OK", "data": data }) })
    }

    fn fail(status: u16) -> Result<Reply, String> {
        Ok(Reply { status, body: json!({ "status": false, "message": "Rejected" }) })
    }

    /// Kirana-B with one valid access token, A2, issued by /auth/refresh.
    fn server(call: &Call) -> Result<Reply, String> {
        if call.url.ends_with("/auth/refresh") {
            ok(json!({ "accessToken": "A2", "refreshToken": "R2" }))
        } else if call.bearer.as_deref() == Some("A2") {
            ok(json!({ "permissions": ["pos.use"] }))
        } else {
            fail(401)
        }
    }

    fn calls_to(s: &Session<MockHttp, MemSecrets>, route: &str) -> usize {
        s.http.calls.lock().unwrap().iter().filter(|c| c.url.ends_with(route)).count()
    }

    #[tokio::test]
    async fn login_keeps_tokens_out_of_the_reply() {
        let s = session(
            |_| ok(json!({ "accessToken": "A1", "refreshToken": "R1", "me": { "permissions": [] } })),
            None,
        );
        let reply = s.login("ravi", "secret", None).await;

        assert_eq!(reply.status, 200);
        assert_eq!(reply.body["data"], json!({ "me": { "permissions": [] } }));
        assert_eq!(s.access(), Some("A1".to_string()));
        assert_eq!(s.secrets.load(), Some("R1".to_string()));
        let calls = s.http.calls.lock().unwrap();
        assert_eq!(calls[0].url, "http://api.test/api/v1/auth/login");
        assert_eq!(
            calls[0].body,
            Some(json!({ "identifier": "ravi", "password": "secret", "deviceName": DEVICE_NAME }))
        );
    }

    #[tokio::test]
    async fn login_passes_the_business_choice_through_and_resends_with_kirana_id() {
        let s = session(
            |c| match c.body.as_ref().and_then(|b| b.get("kiranaId")) {
                Some(_) => ok(json!({ "accessToken": "A1", "refreshToken": "R1", "me": {} })),
                None => Ok(Reply {
                    status: 409,
                    body: json!({ "status": false, "message": "Select a business",
                                  "errors": [{ "id": "k1", "name": "Sharma Kirana" }] }),
                }),
            },
            None,
        );
        let choice = s.login("ravi", "secret", None).await;
        assert_eq!(choice.status, 409);
        assert_eq!(choice.body["errors"][0]["name"], "Sharma Kirana");
        assert_eq!(s.secrets.load(), None);

        assert_eq!(s.login("ravi", "secret", Some("k1")).await.status, 200);
        assert_eq!(s.http.calls.lock().unwrap()[1].body.as_ref().unwrap()["kiranaId"], "k1");
        assert_eq!(s.secrets.load(), Some("R1".to_string()));
    }

    #[tokio::test]
    async fn a_401_refreshes_once_and_retries_with_the_new_token() {
        let s = session(server, Some("R1"));
        let reply = s.request("GET", "/catalog/products?page=1", None).await;

        assert_eq!(reply.status, 200);
        assert_eq!(s.secrets.load(), Some("R2".to_string()));
        let calls = s.http.calls.lock().unwrap();
        assert_eq!(calls.len(), 3);
        assert_eq!(calls[1].body, Some(json!({ "refreshToken": "R1" })));
        assert_eq!(calls[2].bearer.as_deref(), Some("A2"));
    }

    #[tokio::test]
    async fn a_rejected_refresh_ends_the_session_without_a_retry() {
        let s = session(|_| fail(401), Some("R1"));
        assert_eq!(s.request("GET", "/business", None).await.status, 401);
        assert_eq!(s.secrets.load(), None);
        assert_eq!(s.http.calls.lock().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn an_offline_refresh_keeps_the_stored_token() {
        let s = session(
            |c| if c.url.ends_with("/auth/refresh") { Err("offline".to_string()) } else { fail(401) },
            Some("R1"),
        );
        assert_eq!(s.request("GET", "/business", None).await.status, 401);
        assert_eq!(s.secrets.load(), Some("R1".to_string()));
    }

    #[tokio::test]
    async fn concurrent_401s_share_one_refresh() {
        let s = session(server, Some("R1"));
        let (a, b) = tokio::join!(s.request("GET", "/a", None), s.request("GET", "/b", None));
        assert_eq!((a.status, b.status), (200, 200));
        assert_eq!(calls_to(&s, "/auth/refresh"), 1);
    }

    #[tokio::test]
    async fn restore_refreshes_then_loads_me() {
        let s = session(server, Some("R1"));
        let reply = s.restore().await;
        assert_eq!(reply.body["data"]["permissions"][0], "pos.use");
        assert_eq!(calls_to(&s, "/auth/refresh"), 1);
        assert_eq!(calls_to(&s, "/auth/me"), 1);
    }

    #[tokio::test]
    async fn restore_without_a_stored_session_makes_no_request() {
        let s = session(server, None);
        assert_eq!(s.restore().await.status, 401);
        assert!(s.http.calls.lock().unwrap().is_empty());
    }

    #[tokio::test]
    async fn logout_revokes_then_forgets_even_offline() {
        let s = session(|_| Err("offline".to_string()), Some("R1"));
        s.set_access(Some("A1".to_string()));
        s.logout().await;

        assert_eq!((s.access(), s.secrets.load()), (None, None));
        let calls = s.http.calls.lock().unwrap();
        assert_eq!(calls[0].url, "http://api.test/api/v1/auth/logout");
        assert_eq!(calls[0].body, Some(json!({ "refreshToken": "R1" })));
    }

    #[tokio::test]
    async fn replies_never_carry_tokens() {
        let s = session(|_| ok(json!({ "accessToken": "X", "refreshToken": "Y", "name": "Shop" })), None);
        assert_eq!(s.request("GET", "/business", None).await.body["data"], json!({ "name": "Shop" }));
    }

    #[tokio::test]
    async fn token_routes_and_odd_methods_are_refused_before_the_network() {
        let s = session(server, None);
        for path in ["/auth/login", "/AUTH/Refresh/", "/auth/logout?all=1"] {
            assert_eq!(s.request("POST", path, None).await.status, 400, "{path}");
        }
        assert_eq!(s.request("TRACE", "/auth/me", None).await.status, 400);
        assert!(s.http.calls.lock().unwrap().is_empty());
    }

    #[test]
    fn only_plain_api_paths_are_routable() {
        assert_eq!(route_of("/Catalog/Products/?q=atta%20chakki").as_deref(), Some("/catalog/products"));
        assert_eq!(route_of("/auth/logout-all").as_deref(), Some("/auth/logout-all"));
        for bad in ["catalog", "/../admin", "//evil.test", "/auth/%6Cogin", "/a b", "/a#b", "/a?b c"] {
            assert_eq!(route_of(bad), None, "{bad}");
        }
    }
}
