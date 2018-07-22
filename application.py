import os
import requests

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

import time

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# all messages by channel
messages_by_channel = dict()


@app.route("/")
def index():
    return render_template('index.html')

@socketio.on("get channels")
def send_channels():
    emit("send channels", {"channels": list(messages_by_channel.keys())}, broadcast=True)

@socketio.on("submit channel")
def create_channel(data):
    channel_name = data["channel name"]
    if channel_name not in messages_by_channel:
        messages_by_channel[channel_name] = []
        emit("accept submit channel", {'success': True}, broadcast=True)
    else:
        emit("accept submit channel", {'success': False}, broadcast=True)

@socketio.on("send message")
def broadcast_message(data):
    channel = data['channel']
    contents = data['message']
    display_name = data['display_name']

    if channel not in messages_by_channel:
        return

    timestamp = time.strftime("%a, %d %b %Y %H:%M:%S +0000", time.gmtime())
    message = {'time': timestamp, 'message': contents, 'display_name': display_name}

    # add message
    messages_by_channel[channel].append(message)
    # only keep the last 100 messages
    if len(messages_by_channel[channel]) > 100:
        messages_by_channel[channel] = messages_by_channel[channel][-100:]

    emit('give messages', {'channel': channel, 'messages': messages_by_channel[channel]})

@socketio.on('request messages')
def give_messages(data):
    channel = data['channel']
    emit('give messages', {'channel': channel, 'messages': messages_by_channel[channel]})
