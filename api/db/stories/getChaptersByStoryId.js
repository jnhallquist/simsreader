'use strict';

module.exports = {
  getChaptersByStoryId: function (story_id, db) {
    return db.query("SELECT * FROM `chapters` WHERE `story_id` = ?", story_id)
    .then(function(res) {
      if (res[0] && res[0].story_id == story_id) {
        return res;
      } else {
        return 0;
      }
    })
    .catch(function(error) {
      throw error;
    });
  }
};
