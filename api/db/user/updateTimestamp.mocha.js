/*global describe, it, before, beforeEach, after, afterEach */

'use strict';

const expect = require('chai').expect,
      moment = require('moment');

let db,
    email = "";

var date = moment().format('YYYY-MM-DD HH:mm:ss');

function updateTimestamp() {
  return db.query("UPDATE members SET last_login = '" + date + "' WHERE email = ?", email)
  .catch(function(error) {
    return {
      log: "error",
      send: true,
      msg: "An internal error has occurred"
    };
  });
}

describe ('Update user:', function() {
  beforeEach(function() {
    email = "mochalatte@test.com";

    return require('E:\\Programming\\simsreader\\api\\db\\db.conn.mocha.js').connect()
    .then(function(connection) {
      db = connection;
      return db;
    });
  });

  it ('updates last_login column', function() {
    return updateTimestamp()
    .then(function(res) {
      expect(res.affectedRows).to.equal(1);
    })
    .catch(function(error) {
      expect(error.msg).to.equal('An internal error has occurred');
    });
  });
});
