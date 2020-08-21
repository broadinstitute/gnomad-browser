/* eslint-disable max-classes-per-file */

class PrefixTrieNode {
  constructor(key) {
    this.key = key
    this.parent = null
    this.children = new Map()
    this.docs = []
  }

  isLeaf() {
    return this.docs.length > 0
  }
}

class PrefixTrie {
  constructor() {
    this.root = new PrefixTrieNode()
  }

  add(word, doc) {
    let node = this.root
    for (const char of word) {
      if (node.children.has(char)) {
        node = node.children.get(char)
      } else {
        const newNode = new PrefixTrieNode()
        node.children = new Map(
          [...node.children.entries(), [char, newNode]].sort((a, b) => a[0].localeCompare(b[0]))
        )
        newNode.parent = node
        node = newNode
      }
    }

    node.docs.push(doc)
  }

  get(word) {
    let node = this.root
    for (const char of word) {
      node = node.children.get(char)
      if (node === undefined) {
        return undefined
      }
    }

    if (!node.isLeaf()) {
      return undefined
    }

    return node.docs
  }

  search(prefix) {
    let node = this.root
    for (const char of prefix) {
      node = node.children.get(char)
      if (node === undefined) {
        return []
      }
    }

    const results = []
    searchHelper(prefix, node, results) // eslint-disable-line no-use-before-define
    return results
  }
}

function searchHelper(word, node, results) {
  if (node.isLeaf()) {
    results.push({
      word,
      docs: node.docs,
    })
  }

  for (const [childKey, childNode] of node.children.entries()) {
    searchHelper(word + childKey, childNode, results)
  }
}

module.exports = PrefixTrie
