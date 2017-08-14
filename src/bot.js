/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/
 This is a sample Slack Button application that provides a custom
 Slash command.
 This bot demonstrates many of the core features of Botkit:
 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately
 # RUN THE BOT:
 Create a Slack app. Make sure to configure at least one Slash command!
 -> https://api.slack.com/applications/new
 Run your bot from the command line:
 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js
 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.
 # EXTEND THE BOT:
 Botkit is has many features for building cool and useful bots!
 Read all about it here:
 -> http://howdy.ai/botkit
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

require('../env.js');

var prFetcher = require('./scripts/pr_fetcher.js');

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

// Fix for https://github.com/howdyai/botkit/issues/108
// 'T026K0SVA' is the team awesome id
controller.storage.teams.save({id: 'T026K0SVA', foo:"bar"}, function(err) {
    if(err)
      console.error(err);
});

controller.on('slash_command', function (slashCommand, message) {

    console.log(message);

    switch (message.command) {
        case '/prs': //handle the `/prs` slash command.

            // Check the token matches to verify this came from slack
            if (message.token !== process.env.VERIFICATION_TOKEN) return;

            if (message.text === "help") {
                slashCommand.replyPrivate(message,
                    "I list pull requests for your team when you type `/prs`.\n" +
                    "Type `/prs public` if you wish to post the open prs to the channel.\n" +
                    "Try typing `/prs` in the #pegasus_team channel to see an example.");
                return;
            }

            // Post the PRs to the channel if 'public' was included in the command or
            // the pegasus team's raco-bot triggered the command.
            if (message.user_id === "U6DT0PPT5" || message.text === "public") {
                prFetcher().then( prResponse => {
                    // Reply in public
                    slashCommand.replyPublicDelayed(message, prResponse);
                });
            } else {
                // Reply in private
                prFetcher().then( prResponse => {
                    slashCommand.replyPrivateDelayed(message, prResponse);
                });
            }

            break;
        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");
    }
});
