/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 * 
 * The Original Code is the Mozilla browser.
 * 
 * The Initial Developer of the Original Code is Netscape
 * Communications, Inc.  Portions created by Netscape are
 * Copyright (C) 1999, Mozilla.  All Rights Reserved.
 * 
 * Contributor(s):
 *   Travis Bogard <travis@netscape.com>
 */

#include "nsCAppLoop.h"
#include "nsCThreadLoop.h"
#include "nsCBreathLoop.h"
#include "nsIGenericFactory.h"

static nsModuleComponentInfo components[] =
{
  { "Native App Service", NS_EVENTLOOP_APP_CID, NS_EVENTLOOP_APP_PROGID,
    nsCAppLoop::Create
  },
  { "Native App Service", NS_EVENTLOOP_THREAD_CID, NS_EVENTLOOP_THREAD_PROGID,
    nsCThreadLoop::Create
  },
  { "Native App Service", NS_EVENTLOOP_BREATH_CID, NS_EVENTLOOP_BREATH_PROGID,
    nsCBreathLoop::Create
  }
};

NS_IMPL_NSGETMODULE("nsNativeAppModule", components)
