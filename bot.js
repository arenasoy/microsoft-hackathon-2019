// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const { ActionTypes, ActivityTypes } = require('botbuilder');

const sent = false;
// Call function to get an attachment.
const reply = { type: ActivityTypes.Message };

// var unirest = require('unirest');
const music = require('musicmatch')({ apikey: 'ff92dcc1428080d86ef81d3f7cd70c2d' });

// Requires request and request-promise for HTTP requests
// e.g. npm install request request-promise
const rp = require('request-promise');
// Requires fs to write synthesized speech to a file
const fs = require('fs');
// Requires xmlbuilder to build the SSML body
const xmlbuilder = require('xmlbuilder');

function getAccessToken(subscriptionKey) {
    let options = {
        method: 'POST',
        uri: 'https://westus.api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'Ocp-Apim-Subscription-Key': 'f9f299f6a46d4975ae50d6f6690f4ee5'
        }
    };
    return rp(options);
}

function textToSpeech(accessToken, text, title) {
    // Create the SSML request.
    let xmlBody = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', 'en-us')
        .ele('voice')
        .att('xml:lang', 'en-us')
        .att('name', 'Microsoft Server Speech Text to Speech Voice (en-US, Guy24KRUS)')
        .txt(text)
        .end();
    // Convert the XML into a string to send in the TTS request.
    let body = xmlBody.toString();

    let options = {
        method: 'POST',
        baseUrl: 'https://westus.tts.speech.microsoft.com/',
        url: 'cognitiveservices/v1',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'cache-control': 'no-cache',
            'User-Agent': 'YOUR_RESOURCE_NAME',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'Content-Type': 'application/ssml+xml'
        },
        body: body
    };

    let request = rp(options)
        .on('response', (response) => {
            if (response.statusCode === 200) {
                request.pipe(fs.createWriteStream(title + '.wav'));
                console.log('\nYour file is ready.\n');
            }
        });
    return request;
}

class MyBot {
    /**
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext) {
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.Message) {
            var lyrics = '';
            await music.trackSearch({ q: turnContext.activity.text, page: 1, page_size: 1 })
                .then(async function(data) {
                    console.log(data.message.body.track_list[0].track.track_id);
                    var id = data.message.body.track_list[0].track.track_id;
                    console.log('id: ' + id);
                    await music.trackLyrics({ track_id: id })
                        .then(async function(data) {
                            console.log(data.message.body);

                            lyrics = data.message.body.lyrics.lyrics_body;
                            console.log('lyrics: ' + lyrics);
                            console.log(lyrics.length);
                            await turnContext.sendActivity(lyrics);
                        }).catch(function(err) {
                            console.log(err);
                        });
                }).catch(function(err) {
                    console.log(err);
                    turnContext.sendActivity('oops, could not find it :c');
                    lyrics = 'oops, could not find it';
                });
        } else {
            console.log('o que eh: ' + turnContext.activity.type);
            await turnContext.sendActivity('Bem vindo ao BOT a Música');
        }

        const subscriptionKey = 'f9f299f6a46d4975ae50d6f6690f4ee5';
        if (!subscriptionKey) {
            throw new Error('Environment variable for your subscription key is not set.');
        };

        try {
            const accessToken = await getAccessToken(subscriptionKey);
            await textToSpeech(accessToken, lyrics, turnContext.activity.text);
        } catch (err) {
            console.log(`Something went wrong: ${ err }`);
        }

        var currentPath = process.cwd() + '\\' + turnContext.activity.text + '.wav';
        console.log('path: ' + currentPath);

        reply.attachments = [ { contentType: 'audio/wav', contentUrl: currentPath, name: 'music' } ];
        
        if (turnContext.activity.text !== undefined) {
            await turnContext.sendActivity(reply);
        }
    }
}

module.exports.MyBot = MyBot;
