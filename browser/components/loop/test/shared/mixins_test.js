/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop, sinon */
/* jshint newcap:false */

var expect = chai.expect;

describe("loop.shared.mixins", function() {
  "use strict";

  var sandbox;
  var sharedMixins = loop.shared.mixins;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
    sharedMixins.setRootObject(window);
  });

  describe("loop.panel.DocumentVisibilityMixin", function() {
    var comp, TestComp, onDocumentVisibleStub, onDocumentHiddenStub;

    beforeEach(function() {
      onDocumentVisibleStub = sandbox.stub();
      onDocumentHiddenStub = sandbox.stub();

      TestComp = React.createClass({
        mixins: [loop.shared.mixins.DocumentVisibilityMixin],
        onDocumentHidden: onDocumentHiddenStub,
        onDocumentVisible: onDocumentVisibleStub,
        render: function() {
          return React.DOM.div();
        }
      });
    });

    function setupFakeVisibilityEventDispatcher(event) {
      sharedMixins.setRootObject({
        document: {
          addEventListener: function(_, fn) {
            fn(event);
          },
          removeEventListener: sandbox.stub()
        }
      });
    }

    it("should call onDocumentVisible when document visibility changes to visible",
      function() {
        setupFakeVisibilityEventDispatcher({target: {hidden: false}});

        comp = TestUtils.renderIntoDocument(TestComp());

        sinon.assert.calledOnce(onDocumentVisibleStub);
      });

    it("should call onDocumentVisible when document visibility changes to hidden",
      function() {
        setupFakeVisibilityEventDispatcher({target: {hidden: true}});

        comp = TestUtils.renderIntoDocument(TestComp());

        sinon.assert.calledOnce(onDocumentHiddenStub);
      });
  });

  describe("AudioMixin", function() {
    var TestComponent, view, audioPlay, audioPause, fakeAudio;

    describe.skip("Standalone", function() {
      // XXX should be written when AudioMixin supports the mozLoop API
    });

    describe("Standalone", function() {
      beforeEach(function() {
        audioPlay = sandbox.spy();
        audioPause = sandbox.spy();

        fakeAudio = sandbox.stub().returns({
          play: audioPlay,
          pause: audioPause
        });

        sharedMixins.setRootObject({
          navigator: {
            mozLoop: undefined // standalone
          },
          Audio: fakeAudio
        });

        TestComponent = React.createClass({
          mixins: [sharedMixins.AudioMixin],
          render: function() {
            return React.DOM.div();
          }
        });
      });

      describe("#playSound", function() {
        var testComp;

        beforeEach(function() {
          testComp = TestUtils.renderIntoDocument(TestComponent());
        });

        it("should play a sound", function() {
          testComp.playSound("call-connected");

          sinon.assert.calledOnce(audioPlay);
        });

        it("should stop all sounds before playing a sound", function() {
          testComp.playSound("call-connected");

          sinon.assert.callCount(audioPause, testComp.availableSoundNames.length);
        });
      });

      describe("#stopSound", function() {
        it("should stop playing a sound", function() {
          var testComp = TestUtils.renderIntoDocument(TestComponent());

          testComp.stopSound("call-connected");

          sinon.assert.calledOnce(audioPause);
        });
      });

      describe("#stopAllSounds", function() {
        it("should stop all sounds", function() {
          var testComp = TestUtils.renderIntoDocument(TestComponent());

          testComp.stopAllSounds();

          sinon.assert.callCount(audioPause, testComp.availableSoundNames.length);
        });
      });

      describe("#componentWillMount", function() {
        it("should load all available sounds", function() {
          var testComp = TestUtils.renderIntoDocument(TestComponent());

          sinon.assert.callCount(fakeAudio, testComp.availableSoundNames.length);
          sinon.assert.calledWithExactly(fakeAudio,
                                         "shared/sounds/call-connected.ogg");
        });
      });

      describe("#componentWillUnmount", function() {
        var mountElem, testComp;

        beforeEach(function() {
          mountElem = document.createElement("div");
          document.body.appendChild(mountElem);
          testComp = React.renderComponent(TestComponent(), mountElem);
        });

        it("should stop all sounds when component is unmounted", function() {
          React.unmountComponentAtNode(mountElem);

          sinon.assert.callCount(audioPause, testComp.availableSoundNames.length);
        });

        it("should unload all audio instances attached to the component",
          function() {
            React.unmountComponentAtNode(mountElem);

            expect(testComp.localSounds).eql({});
          });
      });
    });
  });
});
