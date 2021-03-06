/* jslint node: true */
/* jshint esversion: 6 */

'use strict';
var Promise = require('bluebird');

global.apiPath = __dirname.split('\\').join('/');

const express = require('express'),
      AWS = require('aws-sdk'),
      port = 2112,
      register = require('./users/register.js'),
      login = require('./users/login.js'),
      bodyParser = require('body-parser'),
      app = express(),
      db = require('./db/db.conn.js'),
      logger = require('./logger.js'),
      session = require('express-session'),
      MySQLStore = require('express-mysql-session')(session),
      crypto = require('crypto'),
      cookieParser = require('cookie-parser'),
      secrets = require('./db/secrets.json'),
      updateTimestamp = require('./db/user/updateTimestamp.js'),
      userToken = require('./db/user/verifyToken.js'),
      colors = require('colors'),
      emailer = require(`${global.apiPath}/db/email/transport.js`),
      requestTempPassword = require('./users/forgotPassword.js'),
      resetPassword = require('./users/resetPassword.js'),
      checkExpiration = require('./db/user/isPwTokenValid.js'),
      checkEmail = require('./db/user/getUserByEmail.js'),
      validator = require('./users/util/registrationValidator.js'),
      toSimpleUser = require('./users/toSimpleUser.js'),
      createNewStory = require('./stories/createStory.js'),
      getStories = require('./db/stories/getStoriesByUserId.js'),
      newComment = require('./stories/newComment.js'),
      createNewChapter = require('./stories/createChapter.js'),
      deleteStory = require('./stories/deleteStory.js'),
      getChaptersById = require('./db/stories/getChaptersByStoryId.js'),
      getChaptersByTitle = require('./stories/getChaptersByStoryTitle.js'),
      editStory = require('./stories/editStory.js'),
      deleteChapter = require('./stories/deleteChapter.js'),
      editChapter = require('./stories/editChapter.js'),
      getPages = require('./stories/getPages.js'),
      addPages = require('./stories/addPages.js'),
      getAllStories = require('./db/stories/getAllStories.js'),
      getCoverPage = require('./stories/getCoverPage.js'),
      getChapterDetails = require('./stories/getChapterDetails.js'),
      multer = require('multer'),
      upload = multer(),
      sendReport = require('./stories/sendReport.js');

app.use(cookieParser('sugar_cookie'));

db.init();

app.use(session({
  secret: 'extrabutter',
  name: 'croissant',
  store: new MySQLStore(secrets, function() {
    return db.init()
    .then(function(res) {
      return res;
    });
  }),
  resave: true,
  saveUninitialized: false,
  cookie: { secure: false },
  genid: function(req) {
    return crypto.randomBytes(10).toString('hex');
  }
}));

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin');
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**************************/
/* User calls
/**************************/
app.post('/getUserByEmail', function (req, res) {
  return validator.registrationValidator(req.body.email)
  .then(function(response) {
    return checkEmail.getUserByEmail(req.body.email)
    .then(function(response) {
      return responseHandler({items: response, send: true}, res);
    });
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

/**************************/
/* Register calls
/**************************/
app.post('/register', function (req, res) {
  return register.registerUser(req.body)
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

/**************************/
/* Login calls
/**************************/
app.post('/login', function(req, res) {
  return login.loginUser(req.body)
  .then(function(response) {
    req.session.isloggedin = true;
    req.session.user = toSimpleUser(response.items);

    updateTimestamp(db.conn(), req.body.email)
    .catch(function(error) {
      logger.error('updateTimestamp: ', error);
    });
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/logout', function(req, res) {
  req.session.isloggedin = false;
  return responseHandler({msg: "Goodbye!", items: {}, send: true}, res);
});

app.get('/isloggedin', function(req, res) {
  if (!req.session || !req.session.isloggedin) {
    return responseHandler({msg: 'Please login', send: true}, res);
  }

  return responseHandler({items: req.session.user, send: true}, res);
});

/**************************/
/* verify token
/**************************/
app.get('/verify/:verification_token', function(req, res) {
  return userToken.verifyToken(req.params.verification_token, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res, 401);
  });
});

/**************************/
/* request password reset
/**************************/
app.post('/forgotPassword', function(req, res) {
  if (req.session.isloggedin) {
    return responseHandler({"msg": "Cannot recover password while logged in."}, res, 401);
  }

  return requestTempPassword.forgotPassword(req.body.email)
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

/**************************/
/* reset password
/**************************/
app.get('/resetPassword/:passwordToken', function(req, res) {
  return checkExpiration.isPwTokenValid(db.conn(), req.params.passwordToken)
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res, 401);
  });
});

app.post('/resetPassword', function(req, res) {
  if (req.session.isloggedin) {
    return responseHandler({"msg": "Cannot reset while logged in."}, res, 401);
  }

  return resetPassword.checkExp(req.body, db.conn())
  .then(function(response) {
    if (response === true) {
      return resetPassword.resetPassword(req.body, db.conn());
    }
    return responseHandler({msg: 'This link has already expired.', send: true}, res);
  })
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

/**************************/
/* story mgtmt calls
/**************************/
app.post('/sendReport', function(req, res) {
  return sendReport.sendReport(req.body.story_id, req.body.chapter_id, req.body.comment_id, req.body.flags, req.body.explanation, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/createStory', function(req, res) {
  return createNewStory.createStory(req.body, req.session.user, req.sessionID, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/editStory', function(req, res) {
  return editStory.editStoryById(req.body, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getStories', function(req, res) {
  return getStories.getStoriesByUserId(req.session.user, db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/deleteStory', function(req, res) {
  return deleteStory.deleteStoryByID(req.body.story_id, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/deleteChapter', function(req, res) {
  return deleteChapter.deleteChapterByID(req.body.chapter_id, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/createChapter', function(req, res) {
  return createNewChapter.createChapter(req.body.story_id, req.body.chapter_title, req.session.user, req.sessionID, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/editChapter', function(req, res) {
  return editChapter.editChapterById(req.body, db.conn())
  .then(function(response) {
    return responseHandler(response, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getChapters', function(req, res) {
  return (req.query.story_id ? getChaptersById.getChaptersByStoryId(req.query.story_id, db.conn())
                             : getChaptersByTitle.getChaptersByStoryTitle(req.query.story_title, req.session.user.id, db.conn()))
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.post('/addPages', upload.any([{name: 'files'}]), function(req, res) {
  return addPages.checkValues(req.files, req.body.story_id, req.body.story_title, req.body.chapter_id, req.body.chapter_index, req.body.captions, req.body.files, req.session.user, req.sessionID, req.body.readyForPublish, db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getPages', function(req, res) {
  return getPages.getPages(req.session.user, req.query.story_id, req.query.story_title, req.query.chapter_id, req.query.chapter_index, db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getAllStories', function(req, res) {
  return getAllStories(db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getCoverPage', function(req, res) {
  return getCoverPage(req.query.story_id, db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});

app.get('/getChapterDetails', function(req, res) {
  return getChapterDetails.getChapterDetails(req.query.story_id, req.query.index, db.conn())
  .then(function(response) {
    return responseHandler({items: response, send: true}, res);
  })
  .catch(function(error) {
    return responseHandler(error, res);
  });
});


/**************************/
/* comments calls
/**************************/
//TODO: finish this
// app.post('/newComment', function(req, res) {
//   return newComment.newComment(req.body, req.session.user, req.sessionID, db.conn())
//   .then(function(response) {
//     return responseHandler(response, res);
//   })
//   .catch(function(error) {
//     return responseHandler(error, res);
//   });
// });

/**************************/
/* response handler
/**************************/
function responseHandler(response, res, statusCode) {
  if (!response) {
    logger.error('No response passed to response handler');
    if (res) {
      res.end(400, "Internal error has occurred.");
    }

    return false;
  }

  if (response && response.log) {
    logger[response.log](response.msg, response.logmsg);
  }

  //
  //TODO: Jen -- write test for this
  // Justin -- make recursive
  //
  if (typeof response.msg === "object") {
    let msgStr = "";
    let keys = Object.keys(response.msg);
    let count = 1;
    keys.forEach(function(key) {
      msgStr += response.msg[key].toString();
      if (count < keys.length) {
        msgStr += ", ";
      }
      count ++;
    });

    response.msg = msgStr;
  }

  if (statusCode) {
    res.statusCode = statusCode;
  }

  if (res && response.send) {
    if (response.redirect) {
      res.send(JSON.stringify({"msg": response.msg, "items": response.items, "redirect": true}));
    } else {
      res.send(JSON.stringify({"msg": response.msg, "items": response.items}));
    }
  }

  if (response.send && !res) {
    return logger.error('No http.res passed to response handler');
  }

  if (res) res.end();
}

app.listen(port, function() {
  console.log(`\nListening on port ${port}\n`.cyan);
});
