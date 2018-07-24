import os
import requests
import time, re

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit

from markdown2 import Markdown


# make it so that a link doesn't need angle brackets around it.
# from https://github.com/trentm/python-markdown2/wiki/link-patterns#converting-links-into-links-automatically

# I replaced the regex they used with the one here so that a link doesn't need to
# have www. and http in in it to be automatically linkified.
# I used the url-detecting regex from here (under heading 6):
# https://code.tutsplus.com/tutorials/8-regular-expressions-you-should-know--net-6149
# link_patterns = [(re.compile(r'((https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?)'), r'\1')]
link_patterns = [(re.compile(r'((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+[@.])?[A-Za-z0-9\.\-]+(:[0-9]+)?|(?:www\.|[\-;:&=\+\$,\w]+[@.])[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_%#*]*)?\??(?:[\-\+=&;%@\.\w_%#*]*)#?(?:[\.\!\/\\\w%#*]*))?)'), r'\1')]
#
markdown = Markdown(extras=["link-patterns"], link_patterns=link_patterns)


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# all messages by channel
messages_by_channel = dict()

# Render the main (and only) page
@app.route("/")
def index():
    return render_template('index.html')

# when client requests the channels,
@socketio.on("get channels")
# send them the channels
def send_channels():
    emit("send channels", {"channels": list(messages_by_channel.keys())})

# when client submits a channel to be created
@socketio.on("submit channel")
# create the channel
def create_channel(data):
    channel_name = data["channel name"]
    # but only if no channels with the same name already exist
    if channel_name not in messages_by_channel:
        messages_by_channel[channel_name] = []
        emit("accept submit channel", {'success': True})
    else:
        emit("accept submit channel", {'success': False, 'channel': channel_name})

# when a client sends a message
@socketio.on("send message")
def broadcast_message(data):
    channel = data['channel']

    display_name = data['display_name']

    # converts any markdown in the message to html

    contents = markdown.convert(data['message'])

    # the current time, formatted
    # I used the example here: https://docs.python.org/2/library/time.html
    timestamp = time.strftime("%a, %d %b %Y %H:%M:%S", time.gmtime())

    # the full message object
    message = {'time': timestamp, 'message': contents, 'display_name': display_name}

    # add the message to the channel
    messages_by_channel[channel].append(message)

    # only keep the last 100 messages
    if len(messages_by_channel[channel]) > 100:
        messages_by_channel[channel] = messages_by_channel[channel][-100:]

    # notify everyone that there is a new message. and what channel it is from
    emit('notify new message', {'channel': channel}, broadcast=True)

@socketio.on('request messages')
def give_messages(data):
    channel = data['channel']
    if channel not in messages_by_channel:
        return
    emit('give messages', {'channel': channel, 'messages': messages_by_channel[channel]})

