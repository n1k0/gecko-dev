/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.store = loop.store || {};

loop.store.FeedbackStore = (function() {
  "use strict";

  var sharedActions = loop.shared.actions;
  var FEEDBACK_STATES = loop.store.FEEDBACK_STATES = {
    // Initial state (mood selection)
    INIT: "feedback-init",
    // User detailed feedback form step
    DETAILS: "feedback-details",
    // Feedback data are ready to be sent
    FILLED: "feedback-filled",
    // Pending feedback data submission
    PENDING: "feedback-pending",
    // Feedback has been sent
    SENT: "feedback-sent",
    // There was an issue with the feedback API
    FAILED: "feedback-failed"
  };

  /**
   * Feedback store.
   *
   * @param {loop.Dispatcher} dispatcher  The dispatcher for dispatching actions
   *                                      and registering to consume actions.
   * @param {Object} options Options object:
   * - {mozLoop}        mozLoop                 The MozLoop API object.
   * - {feedbackClient} loop.FeedbackAPIClient  The feedback API client.
   */
  var FeedbackStore = loop.store.createStore({
    actions: [
      "setFeedbackMood",
      "setFeedbackDetails",
      "sendFeedback",
      "sendFeedbackError"
    ],

    initialize: function(options) {
      if (!options.feedbackClient) {
        throw new Error("Missing option feedbackClient");
      }
      this._feedbackClient = options.feedbackClient;
    },

    /**
     * Returns initial state data for this active room.
     */
    getInitialStoreState: function() {
      return {feedbackState: FEEDBACK_STATES.INIT};
    },

    setFeedbackMood: function(actionData) {
      // XXX:If the user is happy, we directly send this information to the
      // feedback API; this is a behavior we might want to revisit in the future
      if (actionData.happy) {
        this.setStoreState({happy: true});
        this.dispatchAction(new sharedActions.SendFeedback({}));
        return;
      }
      this.setStoreState({
        happy: false,
        feedbackState: FEEDBACK_STATES.DETAILS
      });
    },

    setFeedbackDetails: function(actionData) {
      this.setStoreState({
        category: actionData.category,
        description: actionData.description,
        feedbackState: FEEDBACK_STATES.FILLED
      });
    },

    sendFeedback: function(actionData) {
      var storeState = this.getStoreState();
      var feedbackData = {happy: storeState.happy};
      if (storeState.category) {
        feedbackData.category = storeState.category;
      }
      if (storeState.description) {
        feedbackData.description = storeState.description;
      }
      this._feedbackClient.send(feedbackData, function(err) {
        if (err) {
          this.dispatchAction(new sharedActions.SendFeedbackError({
            error: err
          }));
          return;
        }
        this.setStoreState({feedbackState: FEEDBACK_STATES.SENT});
      }.bind(this));

      this.setStoreState({feedbackState: FEEDBACK_STATES.PENDING});
    },

    sendFeedbackError: function(actionData) {
      this.setStoreState({
        feedbackState: FEEDBACK_STATES.FAILED,
        error: actionData.error
      });
    }
  });

  return FeedbackStore;
})();
