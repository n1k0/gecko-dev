/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.shared = loop.shared || {};
loop.shared.mixins = (function() {
  "use strict";

  /**
   * Root object, by default set to window.
   * @type {DOMWindow|Object}
   */
  var rootObject = window;

  /**
   * Sets a new root object. This is useful for testing native DOM events so we
   * can fake them.
   *
   * @param {Object}
   */
  function setRootObject(obj) {
    console.info("loop.shared.mixins: rootObject set to", obj);
    rootObject = obj;
  }

  /**
   * Dropdown menu mixin.
   * @type {Object}
   */
  var DropdownMenuMixin = {
    get documentBody() {
      return rootObject.document.body;
    },

    getInitialState: function() {
      return {showMenu: false};
    },

    _onBodyClick: function() {
      this.setState({showMenu: false});
    },

    componentDidMount: function() {
      this.documentBody.addEventListener("click", this._onBodyClick);
      this.documentBody.addEventListener("blur", this.hideDropdownMenu);
    },

    componentWillUnmount: function() {
      this.documentBody.removeEventListener("click", this._onBodyClick);
      this.documentBody.removeEventListener("blur", this.hideDropdownMenu);
    },

    showDropdownMenu: function() {
      this.setState({showMenu: true});
    },

    hideDropdownMenu: function() {
      this.setState({showMenu: false});
    },

    toggleDropdownMenu: function() {
      this.setState({showMenu: !this.state.showMenu});
    },
  };

  /**
   * Document visibility mixin. Allows defining the following hooks for when the
   * document visibility status changes:
   *
   * - {Function} onDocumentVisible For when the document becomes visible.
   * - {Function} onDocumentHidden  For when the document becomes hidden.
   *
   * @type {Object}
   */
  var DocumentVisibilityMixin = {
    _onDocumentVisibilityChanged: function(event) {
      var hidden = event.target.hidden;
      if (hidden && typeof this.onDocumentHidden === "function") {
        this.onDocumentHidden();
      }
      if (!hidden && typeof this.onDocumentVisible === "function") {
        this.onDocumentVisible();
      }
    },

    componentDidMount: function() {
      rootObject.document.addEventListener(
        "visibilitychange", this._onDocumentVisibilityChanged);
    },

    componentWillUnmount: function() {
      rootObject.document.removeEventListener(
        "visibilitychange", this._onDocumentVisibilityChanged);
    }
  };

  /**
   * Audio mixin. , ensuring it is stopped
   * when the component is unmounted.
   */
  var AudioMixin = {
    /**
     * List of available sounds.
     * @type {Array}
     */
    availableSoundNames: [
      "Firefox-Long",
      "call-connected",
      "call-disconnected",
      "call-failed",
      "call-progress-connect",
      "call-progress-ringback"
    ],

    /**
     * Hash of loaded audio elements.
     * @type {Object}
     */
    localSounds: {},

    /**
     * Checks if current environment is Loop desktop (false means standalone).
     *
     * @return {Boolean}
     */
    _isLoopDesktop: function() {
      // XXX is this enough?
      return typeof rootObject.navigator.mozLoop === "object";
    },

    /**
     * Preloads all the available sounds.
     */
    componentWillMount: function() {
      if (!this._isLoopDesktop()) {
        this.localSounds = this.availableSoundNames.reduce(function(sounds, name) {
          sounds[name] = new rootObject.Audio("shared/sounds/" + name + ".ogg");
          return sounds;
        }, {});
      }
    },

    /**
     * Ensures audio is stopped when the component is unmounted.
     */
    componentWillUnmount: function() {
      this.stopAllSounds();

      if (!this._isLoopDesktop()) {
        for (var name in this.localSounds) {
          delete this.localSounds[name];
        }
      }
    },

    /**
     * Retrieves an Audio instance for that name. Standalone only.
     *
     * @param  {String} name
     * @return {Audio}
     */
    _getLocalSound: function(name) {
      if (this._isLoopDesktop()) {
        throw new Error("Can't use local sound files from Loop desktop.");
      }

      if (!(name in this.localSounds)) {
        console.error("Sound " + name + " doesn't exist.");
        return;
      }

      return this.localSounds[name];
    },

    /**
     * Starts playing an audio file, stopping any audio that is already in
     * progress.
     *
     * @param {String} name The sound name to play.
     */
    playSound: function(name) {
      this.stopAllSounds();

      if (this._isLoopDesktop()) {
        // XXX navigator.mozLoop.playSound(name)
        return;
      }

      var sound = this._getLocalSound(name);
      if (sound) {
        sound.play();
      }
    },

    /**
     * Stops playing an audio file.
     *
     * @param {String} name The sound name to play (see availableSoundNames).
     */
    stopSound: function(name) {
      if (this._isLoopDesktop()) {
        // XXX navigator.mozLoop.stopSound(name)
        return;
      }

      var sound = this._getLocalSound(name);
      if (sound) {
        sound.pause();
        // For some reason, the sound object might have been made unavailable at
        // this point, triggering an InvalidStateError.
        try {
          sound.currentTime = 0;
        } catch (e){}
      }
    },

    /**
     * Stops all sounds.
     */
    stopAllSounds: function() {
      this.availableSoundNames.forEach(this.stopSound, this);
    }
  };

  return {
    AudioMixin: AudioMixin,
    setRootObject: setRootObject,
    DropdownMenuMixin: DropdownMenuMixin,
    DocumentVisibilityMixin: DocumentVisibilityMixin
  };
})();
