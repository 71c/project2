var socket;
document.addEventListener('DOMContentLoaded', () => {


    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {
        socket.emit('get channels');
        load_channel();
    });


    if (!localStorage.getItem('display_name')) {
        document.querySelector('#submit').disabled = true;
        // disables clicking out of the modal. Taken from https://stackoverflow.com/a/16155852/9911203
        $('#myModal').modal({
            backdrop: 'static',
            keyboard: false,
            show: true
        });

        document.querySelector('#make_name').onsubmit = function() {
            let name = document.querySelector('#name_input').value;
            localStorage.setItem('display_name', name);

            $('#myModal').modal('hide');
            display_name_info();

            // Stop form from submitting
            return false;
        };
        document.querySelector('#name_input').onkeyup = function() {
            let message_is_empty = this.value.length === 0;
            document.querySelector('#submit').disabled = message_is_empty;
        };
    } else {
        display_name_info();
    }

    function display_name_info() {
        document.getElementById('info').innerHTML = 'Your username: ';
        document.getElementById('screen_name_info').innerHTML = localStorage.getItem('display_name');
    }



    configure_make_channel_form();


    socket.on('give messages', data => {
        if (localStorage.getItem('current_channel') === data.channel) {
            if (!document.querySelector('#right')) {
                render_channel_part();
            }
            document.querySelector('#channel').innerHTML = data.channel;

            var messages_list = document.getElementById("messages");
            // Removes all children. I used this to help me: https://stackoverflow.com/a/3955238/9911203
            while (messages_list.firstChild) {
                messages_list.removeChild(messages_list.firstChild);
            }


            let i = 0;
            for (let message of data.messages) {
                let element = make_message(message);
                if (i % 2 === 1) {
                    element.setAttribute('style', 'background-color:white;');
                }
                else {
                    element.setAttribute('style', 'background-color:#ededed;');
                }
                messages_list.append(element);
                if (i === data.messages.length - 1) {
                    element.scrollIntoView({ behavior: 'auto' });
                }
                i++;
            }
        }
    });

    socket.on('send channels', data => {

        // removes existing channel list
        document.querySelector('#left').removeChild(document.querySelector('#channels_list'));

        // creates a new channel list
        let channel_list = document.createElement('div');
        channel_list.setAttribute('role', "tablist");
        channel_list.setAttribute('class', 'list-group')
        channel_list.setAttribute('id', 'channels_list');

        // adds the channels
        for (let channel of data.channels) {
            let button = document.createElement('a');
            button.setAttribute('class', 'list-group-item list-group-item-action');
            button.setAttribute('role', 'tab');
            button.setAttribute('id', channel);
            button.innerText = channel;

            button.onclick = function() {
                let channel_name = this.innerHTML;

                // if the channel is already selectd
                if (button.classList.contains('active'))
                    return;

                // For changing the classes I referenced: https://www.w3schools.com/howto/howto_js_add_class.asp
                // based on http://jsfiddle.net/mgjk3xk2/
                this.parentNode.childNodes.forEach(function(item) {
                    item.classList.remove('active');
                });
                this.classList.add('active');

                localStorage.setItem('current_channel', channel_name);
                load_channel();
            };
            channel_list.append(button);
        }
        document.querySelector('#left').appendChild(channel_list);

        // activate the current channel
        // select current channel button
        let button = document.getElementById(localStorage.getItem('current_channel'));
        // if it exists, make it active
        if (button)
            button.classList.add('active');
    });

    socket.on('accept submit channel', data => {
        if (data.success) {
            socket.emit('get channels');
        }
        else {
            alert('Channel already exists');
        }
    });

    // When notified that there is a new message,
    socket.on('notify new message', data => {
        // check whether the message is from the active channel
        if (localStorage.getItem('current_channel') === data.channel) {
            // request a refresh of the channel
            load_channel();
        }
    });

    function load_channel() {
        let current_channel = localStorage.getItem('current_channel');
        socket.emit('request messages', { 'channel': current_channel });
    }

    // makes the DOM for the channel part on the right with JavaScript
    function render_channel_part() {
        let channel_heading = document.createElement('h3');
        channel_heading.setAttribute('id', 'channel');

        let messages = document.createElement('div');
        messages.setAttribute('class', 'list-group-flush');

        messages.setAttribute('id', 'messages');

        let send_message = document.createElement('form');
        send_message.onsubmit = function() {
            let message = document.querySelector('#message').value;
            socket.emit('send message', { 'channel': localStorage.getItem('current_channel'), 'message': message, 'display_name': localStorage.getItem('display_name') });
            load_channel();

            document.querySelector('#message').value = '';
            document.querySelector('#submit_message').disabled = true;

            // Stop form from submitting
            return false;
        };
        send_message.setAttribute('id', 'send_message');
        send_message.setAttribute('class', 'd-flex bd-highlight');
        let message_input = document.createElement('input');
        message_input.setAttribute('type', 'text');
        message_input.setAttribute('placeholder', 'send a message');
        message_input.setAttribute('id', 'message');
        message_input.setAttribute('class', 'form-control flex-grow-1')
        // Enable button only if there is text in the input field
        message_input.onkeyup = function() {
            let message_is_empty = this.value.length === 0;
            document.querySelector('#submit_message').disabled = message_is_empty;
        };

        let submit_message = document.createElement('button');
        submit_message.setAttribute('id', 'submit_message');
        submit_message.setAttribute('class', 'btn btn-primary');
        submit_message.innerHTML = 'Send';
        // By default, submit button is disabled
        submit_message.disabled = true;

        send_message.append(message_input);
        send_message.append(submit_message);


        let right = document.createElement('div');

        right.setAttribute('id', 'right');

        right.append(channel_heading);


        let messages_container = document.createElement('div');
        messages_container.setAttribute('id', 'messages_container');
        messages_container.setAttribute('class', 'd-flex flex-column mb-3');
        messages_container.append(messages);
        right.append(messages_container);

        right.append(send_message);


        var body = document.querySelector('body');
        body.append(right);

    }
});

function configure_make_channel_form() {
    document.querySelector('#submit_channel').disabled = true;

    document.querySelector('#make_channel').onsubmit = function() {
        let name = document.querySelector('#channel_input').value;

        socket.emit('submit channel', { 'channel name': name });

        document.querySelector('#channel_input').value = '';
        document.querySelector('#submit_channel').disabled = true;

        // Stop form from submitting
        return false;
    };

    document.querySelector('#channel_input').onkeyup = function() {
        let message_is_empty = this.value.length === 0;
        document.querySelector('#submit_channel').disabled = message_is_empty;
    };
}

function make_message(data) {
    let from = data.display_name;
    let text = data.message;
    let time = data.time;

    let li = document.createElement('li');
    li.setAttribute('class', 'list-group-item');
    let content = document.createElement('div');
    content.setAttribute('class', 'media-body');
    let display_name = document.createElement('h5');
    display_name.setAttribute('class', 'mt-0 mb-1');
    display_name.innerHTML = from;
    let timestamp = document.createElement('small');
    timestamp.innerHTML = time;
    // I used this to help me add padding: https://getbootstrap.com/docs/4.1/utilities/spacing/
    // I found out about the small tag and text muted here: https://getbootstrap.com/docs/4.1/components/list-group/#custom-content
    timestamp.setAttribute('class', 'text-muted pl-2 pt-1');

    let info_div = document.createElement('div');
    info_div.setAttribute('class', 'd-flex justify-content-start');
    info_div.append(display_name);
    info_div.append(timestamp);

    content.append(info_div);

    // I got this code to make DOM from text here: https://stackoverflow.com/a/3104251/9911203
    // makes temporary element and sets its innerHTML to the text
    var wrapper = document.createElement('div');
    wrapper.innerHTML = text;
    // appends its first child, which is now in DOM form, to content
    var parsed = wrapper.firstChild;
    parsed.querySelectorAll('a').forEach(
        function(element) {
            element.setAttribute('href', element.getAttribute('href').replace(/^((?<!https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?)/i, s => 'https://' + s ));
        }
    );
    content.append(parsed);

    li.append(content);

    return li;
}

