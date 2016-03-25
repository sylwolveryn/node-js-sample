var fs = require('fs');
var User = require('./models/user');
var exports = module.exports = {};
var quizzes = {
    javascript: {
        quizFile: 'json/javascriptQuiz.json',
        answerFile: 'json/javascriptQuizAnswerKeys.json'
    },
    jdk8: {
        quizFile: 'json/jdk8Quiz.json',
        answerFile: 'json/jdk8QuizAnswerKeys.json'
    },
    jdk9: {
        quizFile: 'json/jdk9Quiz.json',
        answerFile: 'json/jdk9QuizAnswerKeys.json'
    },
    freemarker: {
        quizFile: 'json/freemarkerQuiz.json',
        answerFile: 'json/freemarkerQuizAnswerKeys.json'
    }
};
var HIGH_SCORE_FILE = 'json/highscore.json';

exports.validateAnswer = function(req) {
    console.log(JSON.stringify(req.session));
    if(!isAnswerIndexValid(req)) {
        return {
            'scoreUp': 0,
            'gameFinished': true
        }
    }

    if(noAnswerWereSubmitted(req)) {
        return {
            'scoreUp': 0,
            'gameFinished': false
        }
    }

    if(wasTheAnswerCorrect(req)) {
        req.session.score += 10;
        if (isAnswerIndexTheLast(req.session)) {
            saveHighScore(req);
        }
        return {
            'scoreUp': 10,
            'gameFinished': isAnswerIndexTheLast(req.session)
        }
    }

    return {
        'scoreUp': 0,
        'gameFinished': false
    };
};

exports.loadQuiz = function(selectedQuiz, req) {
    var quiz;
    req.session.answerIndex = 0;

    for ( var key in quizzes ) {
        if (quizzes.hasOwnProperty(key) && selectedQuiz === key) {
            try {
                quiz = JSON.parse(fs.readFileSync(quizzes[key].quizFile, 'utf8'));
                req.session.quizAnswers = JSON.parse(fs.readFileSync(quizzes[key].answerFile, 'utf8'));
                req.session.quizName = selectedQuiz;
                req.session.quizLength = Object.keys(quiz.questions).length;
                req.session.score = 0;
                break;
            } catch(e) {
                console.error(e);
                return {error: true, message: "Server error.", subMessage: "the requested quiz unfortunately not available right now. Please select another one!"};
            }
        }
    }
    if (quiz) { return quiz; }
    return {error: true, message: "Invalid quiz request", subMessage: "the requested quiz unfortunately not exists yet. Come back later!"};
};

function isAnswerIndexValid(req) {
    return req.session.quizAnswers && req.session.quizAnswers[req.session.answerIndex];
}

function isAnswerIndexTheLast(session) {
    return session.quizLength === session.answerIndex+1;
}

function wasTheAnswerCorrect(req) {
    return req.session.quizAnswers[req.session.answerIndex] === req.body.data;
}

function noAnswerWereSubmitted(req) {
    return req.body.data.length === 0;
}


function saveHighScore(req) {
    "use strict";
    try {
        let highScore = JSON.parse(fs.readFileSync(HIGH_SCORE_FILE, 'utf8'));
        highScore.tables = highScore.tables || {};
        highScore.tables.highscore_per_quiz = highScore.tables.highscore_per_quiz || {};
        highScore.tables.highscore_per_quiz[req.session.quizName] = highScore.tables.highscore_per_quiz[req.session.quizName] || {};
        highScore.tables.highscore_per_quiz[req.session.quizName][req.user.email] =  highScore.tables.highscore_per_quiz[req.session.quizName][req.user.email] || {};
        highScore.tables.highscore_per_quiz[req.session.quizName][req.user.email] = updateUserScoreIfBetter(highScore.tables.highscore_per_quiz[req.session.quizName][req.user.email], req.session.score);

        console.log(JSON.stringify(highScore));
        fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify(highScore), 'utf-8');
    } catch (e) {
        console.error(e);
        console.error("Exception while trying to update highscore table");
    }
}

function updateUserScoreIfBetter(oldScoreObject, newScore) {
    "use strict";
    let newScoreObject = oldScoreObject || {};
    console.log("newScore newScore newScore newScore newScore ");
    console.log(JSON.stringify(newScoreObject));
    console.log(newScore);
    if (isObjectEmpty(newScoreObject)  || newScoreObject.score < newScore) {
        let now = new Date().toISOString();
        newScoreObject.score = newScore;
        newScoreObject.dateTime = now.slice(0, 10) + " " + now.slice(11, 16);
    }
    return newScoreObject;
}

function isObjectEmpty(o) {
    return Object.getOwnPropertyNames(o).length === 0;
}