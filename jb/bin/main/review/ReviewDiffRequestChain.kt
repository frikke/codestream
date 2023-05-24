package com.codestream.review

import com.intellij.diff.chains.DiffRequestChainBase
import com.intellij.diff.chains.DiffRequestProducer

class ReviewDiffRequestChain(val producers: List<ReviewDiffRequestProducer>) : DiffRequestChainBase() {
    override fun getRequests(): List<DiffRequestProducer> = producers
}
