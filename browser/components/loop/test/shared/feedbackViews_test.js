/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global loop, sinon, React */
/* jshint newcap:false */

var expect = chai.expect;
var l10n = navigator.mozL10n || document.mozL10n;
var TestUtils = React.addons.TestUtils;
var sharedViews = loop.shared.views;

describe("loop.shared.views.FeedbackView", function() {
  "use strict";

  var sandbox, comp, dispatcher, fakeFeedbackApiClient, feedbackStore,
      fakeAudioXHR;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeAudioXHR = {
      open: sinon.spy(),
      send: function() {},
      abort: function() {},
      getResponseHeader: function(header) {
        if (header === "Content-Type")
          return "audio/ogg";
      },
      responseType: null,
      response: new ArrayBuffer(10),
      onload: null
    };
    dispatcher = new loop.Dispatcher();
    fakeFeedbackApiClient = {send: sandbox.stub()};
    feedbackStore = new loop.store.FeedbackStore(dispatcher, {
      feedbackClient: fakeFeedbackApiClient
    });
    sandbox.stub(window, "XMLHttpRequest").returns(fakeAudioXHR);
    comp = TestUtils.renderIntoDocument(sharedViews.FeedbackView({
      feedbackStore: feedbackStore
    }));
  });

  afterEach(function() {
    sandbox.restore();
  });

  // local test helpers
  function clickHappyFace(comp) {
    var happyFace = comp.getDOMNode().querySelector(".face-happy");
    TestUtils.Simulate.click(happyFace);
  }

  function clickSadFace(comp) {
    var sadFace = comp.getDOMNode().querySelector(".face-sad");
    TestUtils.Simulate.click(sadFace);
  }

  function fillSadFeedbackForm(comp, category, text) {
    TestUtils.Simulate.change(
      comp.getDOMNode().querySelector("[value='" + category + "']"));

    if (text) {
      TestUtils.Simulate.change(
        comp.getDOMNode().querySelector("[name='description']"), {
          target: {value: "fake reason"}
        });
    }
  }

  function submitSadFeedbackForm(comp, category, text) {
    TestUtils.Simulate.submit(comp.getDOMNode().querySelector("form"));
  }

  describe("Happy feedback", function() {
    it("should send feedback data when clicking on the happy face",
      function() {
        clickHappyFace(comp);

        sinon.assert.calledOnce(fakeFeedbackApiClient.send);
        sinon.assert.calledWith(fakeFeedbackApiClient.send, {happy: true});
      });

    it("should thank the user once happy feedback data is sent", function() {
      fakeFeedbackApiClient.send = function(data, cb) {
        cb();
      };

      clickHappyFace(comp);

      expect(comp.getDOMNode()
                 .querySelectorAll(".feedback .thank-you").length).eql(1);
      expect(comp.getDOMNode().querySelector("button.back")).to.be.a("null");
    });
  });

  describe("Sad feedback", function() {
    it("should bring the user to feedback form when clicking on the sad face",
      function() {
        clickSadFace(comp);

        expect(comp.getDOMNode().querySelectorAll("form").length).eql(1);
      });

    it("should disable the form submit button when no category is chosen",
      function() {
        clickSadFace(comp);

        expect(comp.getDOMNode()
                   .querySelector("form button").disabled).eql(true);
      });

    it("should disable the form submit button when the 'other' category is " +
       "chosen but no description has been entered yet",
      function() {
        clickSadFace(comp);
        fillSadFeedbackForm(comp, "other");

        expect(comp.getDOMNode()
                   .querySelector("form button").disabled).eql(true);
      });

    it("should enable the form submit button when the 'other' category is " +
       "chosen and a description is entered",
      function() {
        clickSadFace(comp);
        fillSadFeedbackForm(comp, "other", "fake");

        expect(comp.getDOMNode()
                   .querySelector("form button").disabled).eql(false);
      });

    it("should empty the description field when a predefined category is " +
       "chosen",
      function() {
        clickSadFace(comp);

        fillSadFeedbackForm(comp, "confusing");

        expect(comp.getDOMNode()
                   .querySelector(".feedback-description").value).eql("");
      });

    it("should enable the form submit button once a predefined category is " +
       "chosen",
      function() {
        clickSadFace(comp);

        fillSadFeedbackForm(comp, "confusing");

        expect(comp.getDOMNode()
                   .querySelector("form button").disabled).eql(false);
      });

    it("should send feedback data when the form is submitted", function() {
      clickSadFace(comp);
      fillSadFeedbackForm(comp, "confusing");

      submitSadFeedbackForm(comp);

      sinon.assert.calledOnce(fakeFeedbackApiClient.send);
      sinon.assert.calledWithMatch(fakeFeedbackApiClient.send, {
        happy: false,
        category: "confusing"
      });
    });

    it("should send feedback data when user has entered a custom description",
      function() {
        clickSadFace(comp);

        fillSadFeedbackForm(comp, "other", "fake reason");
        submitSadFeedbackForm(comp);

        sinon.assert.calledOnce(fakeFeedbackApiClient.send);
        sinon.assert.calledWith(fakeFeedbackApiClient.send, {
          happy: false,
          category: "other",
          description: "fake reason"
        });
      });

    it("should thank the user when feedback data has been sent", function() {
      fakeFeedbackApiClient.send = function(data, cb) {
        cb();
      };
      clickSadFace(comp);
      fillSadFeedbackForm(comp, "confusing");
      submitSadFeedbackForm(comp);

      expect(comp.getDOMNode()
                 .querySelectorAll(".feedback .thank-you").length).eql(1);
    });
  });
});
