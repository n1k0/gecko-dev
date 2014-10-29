/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.store = loop.store || {};

(function() {
  "use strict";

  /**
   * Shared actions.
   * @type {Object}
   */
  var sharedActions = loop.shared.actions;

  /**
   * Room validation schema. See validate.js.
   * @type {Object}
   */
  var roomSchema = {
    roomToken:    String,
    roomUrl:      String,
    roomName:     String,
    maxSize:      Number,
    participants: Array,
    ctime:        Number
  };

  /**
   * Room type. Basically acts as a typed object constructor.
   *
   * @param {Object} values Room property values.
   */
  function Room(values) {
    var validatedData = new loop.validate.Validator(roomSchema || {})
                                         .validate(values || {});
    for (var prop in validatedData) {
      this[prop] = validatedData[prop];
    }
  }

  loop.store.Room = Room;

  /**
   * Room store.
   *
   * Options:
   * - {loop.Dispatcher} dispatcher The dispatcher for dispatching actions and
   *                                registering to consume actions.
   * - {mozLoop}         mozLoop    The MozLoop API object.
   *
   * @extends {Backbone.Events}
   * @param {Object} options Options object.
   */
  function RoomListStore(options) {
    options = options || {};
    this.storeState = {
      error: null,
      pendingCreation: false,
      rooms: []
    };

    if (!options.dispatcher) {
      throw new Error("Missing option dispatcher");
    }
    this.dispatcher = options.dispatcher;

    if (!options.mozLoop) {
      throw new Error("Missing option mozLoop");
    }
    this.mozLoop = options.mozLoop;

    this.dispatcher.register(this, [
      "createRoom",
      "createRoomError",
      "getAllRooms",
      "getAllRoomsError",
      "openRoom",
      "roomCreated",
      "updateRoomList"
    ]);
  }

  RoomListStore.prototype = _.extend({
    /**
     * Maximum size given to createRoom; only 2 is supported (and is
     * always passed) because that's what the user-experience is currently
     * designed and tested to handle.
     */
    maxRoomCreationSize: 2,

    /**
     * The number of hours for which the room will exist.
     */
    defaultExpiresIn: 5,

    /**
     * Retrieves current store state.
     *
     * @return {Object}
     * @see #setStoreState
     */
    getStoreState: function() {
      return this.storeState;
    },

    /**
     * Updates store states and trigger a "change" event.
     *
     * @param {Object} newState The new store state.
     */
    setStoreState: function(newState) {
      for (var key in newState) {
        this.storeState[key] = newState[key];
      }
      console.log("updated state", this.storeState);
      this.trigger("change");
    },

    /**
     * Local proxy helper to dispatch an action.
     *
     * @param {Action} action The action to dispatch.
     */
    _dispatchAction: function(action) {
      this.dispatcher.dispatch(action);
    },

    /**
     * Maps and sorts the raw room list received from the mozLoop API.
     *
     * @param  {Array} rawRoomList Raw room list.
     * @return {Array}
     */
    _processRoomList: function(rawRoomList) {
      if (!rawRoomList) {
        return [];
      }
      return rawRoomList
        .map(function(rawRoom) {
          return new Room(rawRoom);
        })
        .slice()
        .sort(function(a, b) {
          return b.ctime - a.ctime;
        });
    },

    /**
     * Finds the next available room number in the provided room list.
     *
     * @param  {String} nameTemplate The room name template; should contain a
     *                               {{conversationLabel}} placeholder.
     * @return {Number}
     */
    findNextAvailableRoomNumber: function(nameTemplate) {
      var searchTemplate = nameTemplate.replace("{{conversationLabel}}", "");
      var searchRegExp = new RegExp("^" + searchTemplate + "(\\d+)$");

      var roomNumbers = this.storeState.rooms.map(function(room) {
        var match = searchRegExp.exec(room.roomName);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      });

      if (!roomNumbers.length) {
        return 1;
      }

      return Math.max.apply(null, roomNumbers) + 1;
    },

    /**
     * Generates a room names against the passed template string.
     *
     * @param  {String} nameTemplate The room name template.
     * @return {String}
     */
    _generateNewRoomName: function(nameTemplate) {
      var roomLabel = this.findNextAvailableRoomNumber(nameTemplate);
      return nameTemplate.replace("{{conversationLabel}}", roomLabel);
    },

    /**
     * Creates a new room.
     *
     * @param {sharedActions.CreateRoom} actionData The new room information.
     */
    createRoom: function(actionData) {
      this.setStoreState({pendingCreation: true});

      var roomCreationData = {
        roomName:  this._generateNewRoomName(actionData.nameTemplate),
        roomOwner: actionData.roomOwner,
        maxSize:   this.maxRoomCreationSize,
        expiresIn: this.defaultExpiresIn
      };

      // XXX rather listen to the "add" event here?
      this.mozLoop.rooms.create(roomCreationData, function(err, roomData) {
        if (err) {
         this._dispatchAction(new sharedActions.CreateRoomError({
          error: err
         }));
         return;
        }
        this._dispatchAction(new sharedActions.RoomCreated({
          roomData: roomData
        }));
      }.bind(this));
    },

    /**
     * Executed when a room creation error occurs.
     *
     * @param  {Error} error The creation error.
     */
    createRoomError: function(error) {
      this.setStoreState({
        error: error,
        pendingCreation: false
      });
    },

    /**
     * Updates current store state with the new created room information.
     *
     * XXX: This will be reused when we'll get incoming push events, eg. for
     *      rooms created from other devices.
     *
     * @param  {sharedActions.RoomCreated} actionData The action data.
     */
    roomCreated: function(actionData) {
      var roomData = actionData.roomData;
      // XXX: Bug 1090951 will provide the expected room data; in the meawhile,
      // filling locally.
      roomData.participants = [];
      roomData.ctime = new Date().getTime();
      this.setStoreState({
        error: null,
        pendingCreation: false,
        rooms: this._processRoomList(
          this.storeState.rooms.concat(new Room(roomData)))
      });
    },

    /**
     * Gather the list of all available rooms from the MozLoop API.
     */
    getAllRooms: function() {
      this.mozLoop.rooms.getAll(function(err, rawRoomList) {
        var action;
        if (err) {
          action = new sharedActions.GetAllRoomsError({error: err});
        } else {
          action = new sharedActions.UpdateRoomList({roomList: rawRoomList});
        }
        this._dispatchAction(action);
      }.bind(this));
    },

    /**
     * Updates current error state in case getAllRooms failed.
     *
     * @param {sharedActions.UpdateRoomListError} actionData The action data.
     */
    getAllRoomsError: function(actionData) {
      this.setStoreState({error: actionData.error});
    },

    /**
     * Updates current room list.
     *
     * @param {sharedActions.UpdateRoomList} actionData The action data.
     */
    updateRoomList: function(actionData) {
      this.setStoreState({
        error: undefined,
        rooms: this._processRoomList(actionData.roomList)
      });
    },
  }, Backbone.Events);

  loop.store.RoomListStore = RoomListStore;
})();
