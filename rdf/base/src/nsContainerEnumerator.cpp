/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * The contents of this file are subject to the Netscape Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/NPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation. All
 * Rights Reserved.
 *
 * Contributor(s): 
 *   Pierre Phaneuf <pp@ludusdesign.com>
 */

/*

  A simple cursor that enumerates the elements of an RDF container
  (RDF:Bag, RDF:Seq, or RDF:Alt).

  Caveats
  -------

  1. This uses an implementation-specific detail to determine the
     index of the last element in the container; specifically, the RDF
     utilities maintain a counter attribute on the container that
     holds the numeric value of the next value that is to be
     assigned. So, this cursor will bust if you use it with a bag that
     hasn't been created using the RDF utility routines.

 */

#include "nscore.h"
#include "nsCOMPtr.h"
#include "nsIRDFContainerUtils.h"
#include "nsIRDFDataSource.h"
#include "nsIRDFNode.h"
#include "nsIRDFService.h"
#include "nsIServiceManager.h"
#include "nsRDFCID.h"
#include "nsString.h"
#include "nsXPIDLString.h"
#include "prlog.h"
#include "rdf.h"
#include "rdfutil.h"

////////////////////////////////////////////////////////////////////////

static NS_DEFINE_IID(kISupportsIID,         NS_ISUPPORTS_IID);
static NS_DEFINE_CID(kRDFServiceCID,        NS_RDFSERVICE_CID);
static NS_DEFINE_CID(kRDFContainerUtilsCID, NS_RDFCONTAINERUTILS_CID);

////////////////////////////////////////////////////////////////////////

class ContainerEnumeratorImpl : public nsISimpleEnumerator {
private:
    // pseudo-constants
    static nsrefcnt        gRefCnt;
    static nsIRDFResource* kRDF_nextVal;

    nsCOMPtr<nsIRDFDataSource>      mDataSource;
    nsCOMPtr<nsIRDFResource>        mContainer;
    nsCOMPtr<nsIRDFResource>        mOrdinalProperty;

    nsISimpleEnumerator* mCurrent;
    nsIRDFNode*       mResult;
    PRInt32 mNextIndex;

public:
    ContainerEnumeratorImpl(nsIRDFDataSource* ds, nsIRDFResource* container);
    virtual ~ContainerEnumeratorImpl(void);

    NS_DECL_ISUPPORTS

    NS_DECL_NSISIMPLEENUMERATOR
};

nsrefcnt        ContainerEnumeratorImpl::gRefCnt;
nsIRDFResource* ContainerEnumeratorImpl::kRDF_nextVal;


ContainerEnumeratorImpl::ContainerEnumeratorImpl(nsIRDFDataSource* aDataSource,
                                                 nsIRDFResource* aContainer)
    : mCurrent(nsnull),
      mResult(nsnull),
      mNextIndex(1)
{
    NS_INIT_REFCNT();

    mDataSource = dont_QueryInterface(aDataSource);
    mContainer  = dont_QueryInterface(aContainer);

    if (gRefCnt++ == 0) {
        nsresult rv;
        NS_WITH_SERVICE(nsIRDFService, service, kRDFServiceCID, &rv);
        NS_ASSERTION(NS_SUCCEEDED(rv), "unable to acquire resource manager");
        if (NS_FAILED(rv))
            return;

        rv = service->GetResource(RDF_NAMESPACE_URI "nextVal", &kRDF_nextVal);
        NS_ASSERTION(NS_SUCCEEDED(rv), "unable to get resource");
    }
}


ContainerEnumeratorImpl::~ContainerEnumeratorImpl(void)
{
#ifdef DEBUG_REFS
    --gInstanceCount;
    fprintf(stdout, "%d - RDF: ContainerEnumeratorImpl\n", gInstanceCount);
#endif

    NS_IF_RELEASE(mResult);
    NS_IF_RELEASE(mCurrent);

    if (--gRefCnt == 0) {
        NS_IF_RELEASE(kRDF_nextVal);
    }
}

NS_IMPL_ISUPPORTS1(ContainerEnumeratorImpl, nsISimpleEnumerator)


NS_IMETHODIMP
ContainerEnumeratorImpl::HasMoreElements(PRBool* aResult)
{
    NS_PRECONDITION(aResult != nsnull, "null ptr");
    if (! aResult)
        return NS_ERROR_NULL_POINTER;

    nsresult rv;

    // If we've already queued up a next value, then we know there are more elements.
    if (mResult) {
        *aResult = PR_TRUE;
        return NS_OK;
    }

    // Otherwise, we need to grovel

    // Figure out the upper bound so we'll know when we're done. Since it's
    // possible that we're targeting a composite datasource, we'll need to
    // "GetTargets()" and take the maximum value of "nextVal" to know the
    // upper bound.
    PRInt32 count = 0;

    nsCOMPtr<nsISimpleEnumerator> targets;
    rv = mDataSource->GetTargets(mContainer, kRDF_nextVal, PR_TRUE, getter_AddRefs(targets));
    if (NS_FAILED(rv)) return rv;

    while (1) {
        PRBool hasmore;
        targets->HasMoreElements(&hasmore);
        if (! hasmore)
            break;

        nsCOMPtr<nsISupports> isupports;
        targets->GetNext(getter_AddRefs(isupports));

        nsCOMPtr<nsIRDFLiteral> nextValLiteral = do_QueryInterface(isupports);
        if (! nextValLiteral)
             continue;

         nsXPIDLString nextValStr;
         nextValLiteral->GetValue(getter_Copies(nextValStr));

         PRInt32 err;
         PRInt32 nextVal = nsAutoString(nextValStr).ToInteger(&err);

         if (nextVal > count)
             count = nextVal;
    }

    // Now iterate through each index.
    while (mCurrent || mNextIndex < count) {
        if (! mCurrent) {
            NS_WITH_SERVICE(nsIRDFContainerUtils, rdfc, kRDFContainerUtilsCID, &rv);
            if (NS_FAILED(rv)) return rv;

            rv = rdfc->IndexToOrdinalResource(mNextIndex, getter_AddRefs(mOrdinalProperty));
            if (NS_FAILED(rv)) return rv;

            rv = mDataSource->GetTargets(mContainer, mOrdinalProperty, PR_TRUE, &mCurrent);
            if (NS_FAILED(rv)) return rv;

            ++mNextIndex;
        }

        do {
            PRBool hasMore;
            rv = mCurrent->HasMoreElements(&hasMore);
            if (NS_FAILED(rv)) return rv;

            // Is the current enumerator depleted?
            if (! hasMore) {
                NS_RELEASE(mCurrent);
                break;
            }

            // "Peek" ahead and pull out the next target.
            nsCOMPtr<nsISupports> result;
            rv = mCurrent->GetNext(getter_AddRefs(result));
            if (NS_FAILED(rv)) return rv;

            rv = result->QueryInterface(NS_GET_IID(nsIRDFNode), (void**) &mResult);
            if (NS_FAILED(rv)) return rv;

            *aResult = PR_TRUE;
            return NS_OK;
        } while (1);
    }

    // If we get here, we ran out of elements. The cursor is empty.
    *aResult = PR_FALSE;
    return NS_OK;
}


NS_IMETHODIMP
ContainerEnumeratorImpl::GetNext(nsISupports** aResult)
{
    nsresult rv;

    PRBool hasMore;
    rv = HasMoreElements(&hasMore);
    if (NS_FAILED(rv)) return rv;

    if (! hasMore)
        return NS_ERROR_UNEXPECTED;

    // Don't AddRef: we "transfer" ownership to the caller
    *aResult = mResult;
    mResult = nsnull;

    return NS_OK;
}


////////////////////////////////////////////////////////////////////////

nsresult
NS_NewContainerEnumerator(nsIRDFDataSource* aDataSource,
                          nsIRDFResource* aContainer,
                          nsISimpleEnumerator** aResult)
{
    NS_PRECONDITION(aDataSource != nsnull, "null ptr");
    if (! aDataSource)
        return NS_ERROR_NULL_POINTER;

    NS_PRECONDITION(aContainer != nsnull, "null ptr");
    if (! aContainer)
        return NS_ERROR_NULL_POINTER;

    NS_PRECONDITION(aResult != nsnull, "null ptr");
    if (! aResult)
        return NS_ERROR_NULL_POINTER;

    ContainerEnumeratorImpl* result = new ContainerEnumeratorImpl(aDataSource, aContainer);
    if (! result)
        return NS_ERROR_OUT_OF_MEMORY;

    NS_ADDREF(result);
    *aResult = result;

    return NS_OK;
}
