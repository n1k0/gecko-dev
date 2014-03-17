/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

function LoopProtocolHandler() {
}

LoopProtocolHandler.prototype = {
  classID: Components.ID("ec2c3c15-a040-4122-8e1a-72e688efdd5b"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: "loop",
  defaultPort: -1,
  // XXX At some stage, we may want to change URI_DANGEROUS_TO_LOAD
  // to URI_IS_UI_RESOURCE for allowing certain access to the protocol.
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD |
    Ci.nsIProtocolHandler.URI_NON_PERSISTABLE |
    Ci.nsIProtocolHandler.URI_FORBIDS_AUTOMATIC_DOCUMENT_REPLACEMENT,

  allowPort: function (port, scheme) {
    return false;
  },

  // This function is based on nsChromeProtocolHandler::NewURI
  newURI: function (aSpec, aCharset, aBaseURI) {
    // Loop: URLs (currently) have no additional structure beyond that
    // provided by standard URLs, so there is no "outer" given to
    // CreateInstance.
    var url = Cc["@mozilla.org/network/standard-url;1"].
                createInstance(Ci.nsIStandardURL);//.QueryInterface(Ci.nsIURL);

    url.init(Ci.nsIStandardURL.URLTYPE_STANDARD, -1, aSpec, aCharset, aBaseURI);

    url.mutable = false;

    return url;
  },

  newChannel: function (aURI) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([LoopProtocolHandler]);
