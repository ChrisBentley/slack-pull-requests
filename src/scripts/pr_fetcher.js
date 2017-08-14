var GitHubApi = require('github');

const githubToken = process.env.GITHUB_TOKEN;
const githubOrg = 'DigitalInnovation';
var githubRepos = ['fesk-plp', 'fesk-store-listing', 'mns-core-ui', 'mns-core-ui-header', 'fesk-metrics', 'mns-core-test', 'mns-fe-foundation', 'fesk-documentation', 'fesk'];


function getAllPrs(github) {

    var pullRequestPromises = [];
    var validPullRequests = [];

    githubRepos.forEach( repo => {
        pullRequestPromises.push(
            github.pullRequests.getAll({
                owner: githubOrg,
                repo: repo
            })
        );
    });

    return Promise.all(pullRequestPromises);
}

function checkLastUpdatedTime(updatedTime) {

    var prTime = new Date(updatedTime);

    var currentTime = new Date();

    var timeDelta = currentTime - prTime;

    var diffDays = Math.floor(timeDelta / 86400000);
    var diffHrs = Math.floor((timeDelta % 86400000) / 3600000);
    var diffMins = Math.round(((timeDelta % 86400000) % 3600000) / 60000);

    var timeAgo = '';

    if (diffDays > 0) {
        timeAgo += diffDays;
        if(diffDays === 1) {
            timeAgo += ' day ';
        } else {
            timeAgo += ' days ';
        }
    }

    if (diffHrs > 0) {
        timeAgo += diffHrs;
        if(diffHrs === 1) {
            timeAgo += ' hour ';
        } else {
            timeAgo += ' hours ';
        }
    }

    timeAgo += diffMins;
    if(diffMins === 1) {
        timeAgo += ' min ago';
    } else {
        timeAgo += ' mins ago';
    }

    return timeAgo;
}

function raccoonUrlFetcher(raccoonType) {
    if(raccoonType === "angry") {
        return 'http://i.imgur.com/ibRrZfd.jpg';
    }
    if(raccoonType === "informative") {
        return 'http://i.imgur.com/zdba83eg.jpg';
    }
    if(raccoonType === "approval") {
        return 'htp://i.imgur.com/JepK3vR.jpg';
    }

    return 'http://i.imgur.com/uzeOvse.png';
}


function main(raccoonImage=true) {
    var github = new GitHubApi({
        debug: true,
        protocol: 'https',
        host: 'api.github.com',
        Promise: require('bluebird'),
        // Promise: Promise,
        timeout: 5000
    });

    github.authenticate({
        type: "oauth",
        token: githubToken
    });

    return getAllPrs(github).then( results => {
        var pullRequests = [];

        for(var i=0; i < results.length; i++) {
            for (var j=0; j < results[i].data.length; j++) {
                pullRequests.push(results[i].data[j]);
            }
        }

        var validPullRequests = [];

        pullRequests.forEach( pr => {
            if(pr.title.toLowerCase().indexOf('do not merge') > -1) {
                return
            } else if(pr.title.toLowerCase().indexOf('wip') > -1) {
                return
            } else {
                validPullRequests.push(pr);
            }
        });

        // Initialise a message string
        var message = '';

        if (validPullRequests.length === 0) {
            message += 'There are no pull requests that need reviewing!\n';
            if (raccoonImage) {
                var raccoonUrl = raccoonUrlFetcher('approval');
                message += '\n\nThe raccoon of the day is: <' + raccoonUrl + '|Approval Raccoon!>';
            }
            return message;
        }

        // Setup a dict to hold any PRs older than 2 days
        var olderPullRequests = [];
        // Setup an info message string to hold the first set of PRs
        infoMessage = '';

        validPullRequests.forEach( pr => {
            pr.username = pr.user.login;
            pr.timeAgo = checkLastUpdatedTime(pr.updated_at);
            pr.repo = pr.review_comments_url.split( githubOrg + '/')[1].split('/pulls')[0];

            if(pr.days_old > 2) {
                older_pull_requests.push(pr);
                return;
            }

            infoMessage += '*' + pr.repo + '*' + ' | ' + pr.username + ' | ' + 'last updated ' + pr.timeAgo + '\n';
            infoMessage += '<' + pr.html_url + '|' + pr.title + '>' + '\n\n';
        });

        if (infoMessage.length > 0) {
            message += '\nThe following pull requests require your attention:\n\n' + infoMessage;
        }

        if(olderPullRequests.length > 0) {
            message += '\nThe following PRs haven\'t been updated in over 2 days!!!\n\n';
        }

        olderPullRequests.forEach( pr => {
            message += "*" + pr.repo + '*' + ' | ' + pr.username + ' | ' + 'last updated ' + pr.timeAgo + '\n';
            message += '<' + pr.html_url + '|' + pr.title + '>' + '\n\n';
        });

        if(raccoonImage){
            if (message.indexOf('over 2 days') > -1) {
                var raccoonUrl = raccoonUrlFetcher('angry');
                message += '\n\nThe raccoon of the day is: <' + raccoonUrl + '|Angry Raccoon!>';
            } else {
                var raccoonUrl = raccoonUrlFetcher('informative');
                message += '\n\nThe raccoon of the day is: <' + raccoonUrl + '|Informative Raccoon!>';
            }
        }

        return message;
    });
}


module.exports = main;
