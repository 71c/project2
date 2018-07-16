import os
import requests

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

import random

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# list of all channels
channel_list = ['general']

@app.route("/")
def index():
    return render_template('index.html')



@socketio.on("submit channel")
def vote(data):
    channel_name = data["channel name"]
    if channel_name not in channel_list:
        channel_list.append(channel_name)
        emit("accept submit channel", {"success": True}, broadcast=True)
    else:
        emit("accept submit channel", {"success": False}, broadcast=True)
