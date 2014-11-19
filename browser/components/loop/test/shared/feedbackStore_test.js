/* global chai, loop */

var expect = chai.expect;
var sharedActions = loop.shared.actions;

describe("loop.store.FeedbackStore", function () {
  "use strict";

  var FEEDBACK_STATES = loop.store.FEEDBACK_STATES;
  var sandbox, dispatcher, store, feedbackClient;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    dispatcher = new loop.Dispatcher();

    feedbackClient = new loop.FeedbackAPIClient("http://invalid", {
      product: "Loop"
    });

    store = new loop.store.FeedbackStore(dispatcher, {
      feedbackClient: feedbackClient
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#constructor", function() {
    it("should throw an error if feedbackClient is missing", function() {
      expect(function() {
        new loop.store.FeedbackStore(dispatcher);
      }).to.Throw(/feedbackClient/);
    });

    it("should set the store to the INIT feedback state", function() {
      var store = new loop.store.FeedbackStore(dispatcher, {
        feedbackClient: feedbackClient
      });

      expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.INIT);
    });
  });

  describe("#setFeedbackMood", function() {
    it("should set the happy state property", function() {
      store.setFeedbackMood(new sharedActions.SetFeedbackMood({happy: true}));

      expect(store.getStoreState("happy")).eql(true);
    });

    it("should send feedback on happy user", function() {
      var dispatch = sandbox.stub(dispatcher, "dispatch");

      store.setFeedbackMood(new sharedActions.SetFeedbackMood({happy: true}));

      sinon.assert.calledOnce(dispatch);
      sinon.assert.calledWithExactly(dispatch,
        new sharedActions.SendFeedback({}));
    });

    it("should transition to DETAILS state on sad user", function() {
      store.setFeedbackMood(new sharedActions.SetFeedbackMood({happy: false}));

      expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.DETAILS);
    });
  });

  describe("#setFeedbackDetails", function() {
    beforeEach(function() {
      store.setStoreState({feedbackState: FEEDBACK_STATES.DETAILS});

      store.setFeedbackDetails(new sharedActions.SetFeedbackDetails({
        category: "fakeCategory",
        description: "fakeDescription"
      }));
    });

    it("should send feedback data over the feedback client", function() {
      expect(store.getStoreState("category")).eql("fakeCategory");
      expect(store.getStoreState("description")).eql("fakeDescription");
    });

    it("should transition to FILLED state", function() {
      expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.FILLED);
    });
  });

  describe("#sendFeedback", function() {
    beforeEach(function() {
      store.setStoreState({
        feedbackState: FEEDBACK_STATES.FILLED,
        happy: false,
        category: "fakeCategory",
        description: "fakeDescription"
      });
    });

    it("should send feedback data over the feedback client", function() {
      sandbox.stub(feedbackClient, "send");

      store.sendFeedback(new sharedActions.SendFeedback({}));

      sinon.assert.calledOnce(feedbackClient.send);
      sinon.assert.calledWithMatch(feedbackClient.send, {
        happy: false,
        category: "fakeCategory",
        description: "fakeDescription"
      });
    });

    it("should transition to PENDING state", function() {
      sandbox.stub(feedbackClient, "send");

      store.sendFeedback(new sharedActions.SendFeedback({}));

      expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.PENDING);
    });

    it("should transition to SENT state on successful submission", function(done) {
      sandbox.stub(feedbackClient, "send", function(data, cb) {
        cb(null);
      });

      store.once("change:feedbackState", function() {
        expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.SENT);
        done();
      });

      store.sendFeedback(new sharedActions.SendFeedback({}));
    });

    it("should transition to FAILED state on failed submission", function(done) {
      sandbox.stub(feedbackClient, "send", function(data, cb) {
        cb(new Error("failed"));
      });

      store.once("change:feedbackState", function() {
        expect(store.getStoreState("feedbackState")).eql(FEEDBACK_STATES.FAILED);
        done();
      });

      store.sendFeedback(new sharedActions.SendFeedback({}));
    });
  });
});
