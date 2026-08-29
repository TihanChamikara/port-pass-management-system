#!/usr/bin/env python
"""
Intercept and log the exact API request that the frontend is sending
"""
import json
import http.server
import socket
from threading import Thread
import time

# Find a free port
def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

PORT = find_free_port()

class RequestLoggerHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        print(f"\n{'='*70}")
        print(f"METHOD: POST")
        print(f"PATH: {self.path}")
        print(f"HEADERS: {dict(self.headers)}")
        print(f"BODY:")
        if body:
            try:
                data = json.loads(body)
                print(json.dumps(data, indent=2))
            except:
                print(body.decode('utf-8', errors='replace'))
        print(f"{'='*70}\n")
        
        # Send response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"request_id": "REQ-20260519-TEST"}')
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

def run_server():
    server = http.server.HTTPServer(('localhost', PORT), RequestLoggerHandler)
    server.timeout = 5
    server.handle_request()  # Handle one request then exit
    server.server_close()

# Start the interception server
print(f"Starting request logger on http://localhost:{PORT}")
print("\nAttempting to submit form... Watch for the request payload below:")
server_thread = Thread(target=run_server, daemon=True)
server_thread.start()

time.sleep(1)
print("\nNow manually fill and submit the form in the browser.")
print(f"The request will be logged above.\n")

# Wait a bit for the server thread
server_thread.join(timeout=30)
