/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */

#ifndef nsXPFCDialog_h___
#define nsXPFCDialog_h___

#include "nsIXPFCDialog.h"
#include "nsXPFCCanvas.h"
#include "nsVoidArray.h"

class nsXPFCDialog : public nsIXPFCDialog,
                     public nsXPFCCanvas

{
public:
  nsXPFCDialog(nsISupports* outer);

  NS_DECL_ISUPPORTS

  NS_IMETHOD Init();

  NS_IMETHOD SetParameter(nsString& aKey, nsString& aValue) ;
  NS_IMETHOD GetClassPreferredSize(nsSize& aSize);
  NS_IMETHOD_(nsEventStatus) ProcessCommand(nsIXPFCCommand * aCommand) ;
  NS_IMETHOD CollectData();
  NS_IMETHOD CollectDataInCanvas(nsIXPFCCanvas* host_canvas, nsVoidArray* DataMembers);

protected:
  ~nsXPFCDialog();


};

#endif /* nsXPFCDialog_h___ */
