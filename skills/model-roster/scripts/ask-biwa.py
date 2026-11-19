#!/usr/bin/env python3
"""
ask-biwa.py
Queries a StartLux-Decision or System One compatible server at POST /v1/systemone (or /v1/decisions).
Exits with 0 on success, or 2 if server is unavailable (triggering fallback to Vertex biwa subagent).
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

DEFAULT_URLS = [
    os.environ.get("STARTLUX_URL"),
    "http://127.0.0.1:8090/v1/systemone",
    "http://127.0.0.1:8090/v1/decisions",
    "http://127.0.0.1:1234/v1/systemone",
]

def check_endpoint(url):
    try:
        # A ping payload with state & questions to verify real decision engine readiness
        ping_payload = json.dumps({
            "state": {"ping": True},
            "questions": {
                "check": {
                    "type": "choice",
                    "instructions": "ping",
                    "criteria": {"ok": "ok"}
                }
            }
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=ping_payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        # If server returns 400 (e.g. no models loaded in LM Studio) or 404, it is NOT ready for decisions
        return False
    except Exception:
        return False

def query_decision_server(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=5.0) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    parser = argparse.ArgumentParser(description="Query StartLux/System One decision engine or check availability")
    parser.add_argument("--check", action="store_true", help="Check if any decision server is online")
    parser.add_argument("--url", type=str, default=None, help="Explicit server URL")
    parser.add_argument("--state", type=str, default='{"status": "evaluating"}', help="JSON string for state")
    parser.add_argument("--question", type=str, default=None, help="JSON string for questions dict")
    args = parser.parse_args()

    active_url = None
    urls_to_try = [args.url] if args.url else [u for u in DEFAULT_URLS if u]

    for candidate in urls_to_try:
        if check_endpoint(candidate):
            active_url = candidate
            break

    if not active_url:
        if args.check:
            print(json.dumps({"available": False, "reason": "No decision server responding"}))
        else:
            print(json.dumps({
                "available": False,
                "action": "fallback_to_cloud_biwa",
                "recommended_agent": "biwa",
                "recommended_model": "google-vertex/gemini-3.5-flash-lite"
            }))
        sys.exit(2)

    if args.check:
        print(json.dumps({"available": True, "url": active_url}))
        sys.exit(0)

    try:
        state_dict = json.loads(args.state)
        questions_dict = json.loads(args.question) if args.question else {
            "verdict": {
                "type": "choice",
                "instructions": "Determine tactical action",
                "criteria": {"proceed": "Safe to proceed", "defer": "Requires user confirmation"}
            }
        }
        payload = {
            "state": state_dict,
            "questions": questions_dict
        }
        result = query_decision_server(active_url, payload)
        print(json.dumps({"available": True, "url": active_url, "response": result}, indent=2))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"available": False, "error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()
