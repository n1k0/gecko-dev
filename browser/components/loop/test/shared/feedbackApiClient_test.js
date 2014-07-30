/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global loop, sinon, it, beforeEach, afterEach, describe */

var expect = chai.expect;

describe("loop.FeedbackAPIClient", function() {
  "use strict";

  var sandbox,
      fakeXHR,
      requests = [];

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeXHR = sandbox.useFakeXMLHttpRequest();
    requests = [];
    // https://github.com/cjohansen/Sinon.JS/issues/393
    fakeXHR.xhr.onCreate = function (xhr) {
      requests.push(xhr);
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#constructor", function() {
    it("should require a baseUrl setting", function() {
      expect(function() {
        return new loop.FeedbackAPIClient();
      }).to.Throw(/required baseUrl/);
    });

    it("should require a product setting", function() {
      expect(function() {
        return new loop.FeedbackAPIClient({baseUrl: "http://fake"});
      }).to.Throw(/required product/);
    });
  });

  describe("constructed", function() {
    var client;

    beforeEach(function() {
      client = new loop.FeedbackAPIClient({
        baseUrl: "http://fake/feedback",
        product: "Hello"
      });
    });

    describe("#send", function() {
      it("should send feedback data", function() {
        client.send({reason: "confusing"}, function(){});

        expect(requests).to.have.length.of(1);
        expect(requests[0].url).to.be.equal("http://fake/feedback");
        expect(requests[0].method).to.be.equal("POST");
        expect(requests[0].requestBody).to.be.equal(JSON.stringify({
          happy: false,
          product: "Hello",
          description: "confusing"
        }));
      });

      it("should send formatted feedback data", function() {
        client.send({
          reason: "other",
          custom: "it's far too awesome!"
        }, function(){});

        expect(requests).to.have.length.of(1);
        expect(requests[0].url).to.be.equal("http://fake/feedback");
        expect(requests[0].method).to.be.equal("POST");
        expect(requests[0].requestBody).to.be.equal(JSON.stringify({
          happy: false,
          product: "Hello",
          description: "other: it's far too awesome!"
        }));
      });

      it("should throw on invalid feedback data", function() {
        expect(function() {
          client.send("invalid data", function(){});
        }).to.Throw(/Invalid/);
      });

      it("should call passed callback on success", function() {
        var cb = sandbox.spy();
        var fakeResponseData = {description: "confusing"};
        client.send({reason: "confusing"}, cb);

        requests[0].respond(200, {"Content-Type": "application/json"},
                            JSON.stringify(fakeResponseData));

        sinon.assert.calledOnce(cb);
        sinon.assert.calledWithExactly(cb, null, fakeResponseData);
      });

      it("should call passed callback on error", function() {
        var cb = sandbox.spy();
        var fakeErrorData = {error: true};
        client.send({reason: "confusing"}, cb);

        requests[0].respond(400, {"Content-Type": "application/json"},
                            JSON.stringify(fakeErrorData));

        sinon.assert.calledOnce(cb);
        sinon.assert.calledWithExactly(cb, sinon.match(function(err) {
          return /Bad Request/.test(err);
        }));
      });
    });
  });
});
