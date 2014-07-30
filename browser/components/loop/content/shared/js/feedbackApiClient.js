/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.FeedbackAPIClient = (function($) {
  "use strict";

  /**
   * Feedback API client. Sends feedback data to an input.mozilla.com compatible
   * API.
   *
   * Available settings:
   * - {String} baseUrl Base API url (required)
   * - {String} product Product name (required)
   *
   * @param {Object} settings Settings.
   * @link  http://fjord.readthedocs.org/en/latest/api.html
   */
  function FeedbackAPIClient(settings) {
    settings = settings || {};
    if (!settings.hasOwnProperty("baseUrl")) {
      throw new Error("Missing required baseUrl setting.");
    }
    this._baseUrl = settings.baseUrl;
    if (!settings.hasOwnProperty("product")) {
      throw new Error("Missing required product setting.");
    }
    this._product = settings.product;
  }

  FeedbackAPIClient.prototype = {
    /**
     * Formats Feedback data to match the API spec.
     *
     * @param  {Object} fields Feedback form data.
     * @return {Object}        Formatted data.
     */
    _formatData: function(fields) {
      if (typeof fields !== "object") {
        throw new Error("Invalid feedback data provided.");
      }

      var description = fields.reason;

      // append custom text to description when provided
      if (fields.reason === "other" && fields.custom) {
        description += ": " + fields.custom;
      }

      return {
        happy:       false,     // We only submit feedback from unhappy users
        product:     this._product,
        description: description
      };
    },

    /**
     * Sends feedback data.
     *
     * @param  {Object}   fields Feedback form data.
     * @param  {Function} cb     Callback
     */
    send: function(fields, cb) {
      var req = $.ajax({
        url:         this._baseUrl,
        method:      "POST",
        contentType: "application/json",
        dataType:    "json",
        data: JSON.stringify(this._formatData(fields))
      });

      req.done(function(result) {
        cb(null, result);
      });

      req.fail(function(jqXHR, textStatus, errorThrown) {
        var message = "Error posting user feedback";
        console.error(message, textStatus, JSON.stringify(jqXHR.responseJSON));
        cb(new Error([message, textStatus, errorThrown].join(" ")));
      });
    }
  };

  return FeedbackAPIClient;
})(jQuery);
