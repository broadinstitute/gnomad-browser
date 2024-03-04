import json
import os

from flask import Flask, request, redirect, render_template_string, session
from requests_oauthlib import OAuth2Session


CLIENT_ID = os.getenv("OAUTH_CLIENT_ID")
CLIENT_SECRET = os.getenv("OAUTH_CLIENT_SECRET")
SCOPE = os.getenv("OAUTH_SCOPE", "public_repo")

AUTHORIZATION_BASE_URL = "https://github.com/login/oauth/authorize"
TOKEN_URL = "https://github.com/login/oauth/access_token"


app = Flask(__name__)

app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

app.secret_key = os.urandom(24)


@app.get("/")
def auth():
    github = OAuth2Session(CLIENT_ID, scope=SCOPE)
    authorization_url, state = github.authorization_url(AUTHORIZATION_BASE_URL)
    session["oauth_state"] = state
    return redirect(authorization_url)


CALLBACK_TEMPLATE = """<!DOCTYPE html>
<html>
<body>
  <script>
    window.addEventListener("message", function (e) {
      if (e.origin !== 'https://gnomad.broadinstitute.org') {
        console.warn('Invalid origin:', e.origin);
        return;
      }
      window.opener.postMessage({{ post_message|safe }}, e.origin);
    }, false)

    window.opener.postMessage("authorizing:github", "*")
  </script>
</body>

</html>
"""


@app.get("/callback")
def callback():
    try:
        github = OAuth2Session(CLIENT_ID, state=session["oauth_state"], scope=SCOPE)
        token = github.fetch_token(TOKEN_URL, client_secret=CLIENT_SECRET, authorization_response=request.url)

        message = "success"
        content = json.dumps({"token": token.get("access_token", ""), "provider": "github"})
    except:  # pylint: disable=bare-except
        message = "error"
        content = "Something went wrong"

    post_message = json.dumps(f"authorization:github:{message}:{content}")

    return render_template_string(CALLBACK_TEMPLATE, post_message=post_message)
