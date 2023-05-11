package com.codestream.review

import com.intellij.diff.chains.DiffRequestChainBase
import com.intellij.diff.chains.DiffRequestProducer

class PullRequestChain(val producers: List<PullRequestProducer>) : DiffRequestChainBase() {
    override fun getRequests(): List<DiffRequestProducer> = producers
}