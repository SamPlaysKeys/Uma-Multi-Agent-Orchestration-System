#!/usr/bin/env python3
"""
ask-biwa.py
Queries a StartLux-Decision, System One, or LM Studio Decision-compatible server
at POST /v1/decisions or POST /v1/systemone.
Exits with 0 on success, or 2 if server is unavailable (triggering fallback to Biwa subagent).
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

DEFAULT_URLS = [
    os.environ.get("STARTLUX_URL"),
    "http://127.0.0.1:1234/v1/decisions",
    "http://127.0.0.1:8090/v1/decisions",
    "http://127.0.0.1:8090/v1/systemone",
    "http://127.0.0.1:1234/v1/systemone",
]

def discover_loaded_decision_model():
    """Checks LM Studio or local endpoints for any loaded decision model ID."""
    try:
        req = urllib.request.Request("http://127.0.0.1:1234/api/v1/models")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for m in data.get("models", []):
                if m.get("type") == "decision":
                    loaded = m.get("loaded_instances", [])
                    if loaded and len(loaded) > 0:
                        return loaded[0].get("id", m.get("key"))
    except Exception:
        pass
    return None

def check_endpoint(url):
    try:
        # Detect model if querying an endpoint that requires model param (like LM Studio /v1/decisions)
        model_id = discover_loaded_decision_model()
        
        if "/v1/decisions" in url:
            ping_payload = json.dumps({
                "model": model_id or "d1-3b",
                "input": "ping",
                "questions": [
                    {
                        "id": "ping",
                        "type": "choice",
                        "instructions": "ping",
                        "choices": [
                            {"value": "ok", "description": "ok"}
                        ]
                    }
                ]
            }).encode("utf-8")
        else:
            # System One payload format
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
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            return resp.status == 200
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
    parser = argparse.ArgumentParser(description="Query StartLux/System One/LM Studio decision engine or check availability")
    parser.add_argument("--check", action="store_true", help="Check if any decision server is online")
    parser.add_argument("--url", type=str, default=None, help="Explicit server URL")
    parser.add_argument("--input", "--state", dest="input_text", type=str, default="Evaluating task routing", help="Input context or task string")
    parser.add_argument("--question", type=str, default=None, help="JSON string for questions")
    parser.add_argument("--model", type=str, default=None, help="Explicit decision model ID (e.g. d1-3b)")
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

    decision_model = args.model or discover_loaded_decision_model() or "d1-3b"

    if args.check:
        print(json.dumps({"available": True, "url": active_url, "model": decision_model}))
        sys.exit(0)

    try:
        if "/v1/decisions" in active_url:
            # LM Studio / OpenAI-compatible /v1/decisions schema
            if args.question:
                questions_obj = json.loads(args.question)
                if isinstance(questions_obj, dict):
                    # convert dict to list if passed as dict
                    q_list = []
                    for qid, qdata in questions_obj.items():
                        choices = []
                        for val, desc in qdata.get("choices", qdata.get("criteria", {})).items():
                            choices.append({"value": val, "description": desc})
                        q_list.append({
                            "id": qid,
                            "type": qdata.get("type", "choice"),
                            "instructions": qdata.get("instructions", ""),
                            "choices": choices
                        })
                    questions = q_list
                else:
                    questions = questions_obj
            else:
                questions = [
                    {
                        "id": "triage_route",
                        "type": "choice",
                        "instructions": "Determine optimal Umamusume specialist or tactical action",
                        "choices": [
                            {"value": "golshi", "description": "Fast scout for rapid file/symbol discovery"},
                            {"value": "spe-chan", "description": "Implementation workhorse for coding, refactoring, and test writing"},
                            {"value": "super-creek", "description": "Debugger and caretaker for tricky bugs, flaky tests, and broken environments"},
                            {"value": "tachyon", "description": "Researcher and reviewer for architecture analysis and external docs"}
                        ]
                    }
                ]
            payload = {
                "model": decision_model,
                "input": args.input_text,
                "questions": questions
            }
        else:
            # System One schema
            payload = {
                "state": {"context": args.input_text},
                "questions": json.loads(args.question) if args.question else {
                    "verdict": {
                        "type": "choice",
                        "instructions": "Determine tactical action",
                        "criteria": {"proceed": "Safe to proceed", "defer": "Requires user confirmation"}
                    }
                }
            }

        result = query_decision_server(active_url, payload)
        print(json.dumps({"available": True, "url": active_url, "model": decision_model, "response": result}, indent=2))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"available": False, "error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()
