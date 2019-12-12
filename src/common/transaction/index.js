import Parse from 'parse/lib/react-native/Parse';
import common from '../common';

import * as btc from './btccoin';
import * as rbtc from './rbtccoin';

const createSignedTransaction = (symbol, rawTransaction, privateKey) => {
  console.log('Transaction.processSignedTransaction start');
  switch (symbol) {
    case 'BTC':
      return btc.signTransaction(rawTransaction, privateKey);
    case 'RBTC':
    case 'RIF':
      return rbtc.signTransaction(rawTransaction, privateKey);
    default:
      return null;
  }
};

const createRawTransactionParam = (params) => {
  switch (params.symbol) {
    case 'BTC':
      return btc.getRawTransactionParam(params);
    case 'RBTC':
    case 'RIF':
      return rbtc.getRawTransactionParam(params);
    default:
      return null;
  }
};

const convertTransferValue = (symbol, value) => {
  switch (symbol) {
    case 'BTC':
      return common.btcToSatoshiHex(value);
    case 'RBTC':
    case 'RIF':
      return common.rbtcToWeiHex(value);
    default:
      return null;
  }
};

const createSendSignedTransactionParam = (symbol, signedTransaction, netType, gasFee) => {
  switch (symbol) {
    case 'BTC':
      return btc.getSignedTransactionParam(signedTransaction, netType, gasFee);
    case 'RBTC':
    case 'RIF':
      return rbtc.getSignedTransactionParam(signedTransaction, netType);
    default:
      return null;
  }
};

class Transaction {
  constructor({
    symbol, type, privateKey, address,
  }, receiver, value, data, gasFee) {
    this.symbol = symbol;
    this.netType = type;
    this.sender = address;
    this.receiver = receiver;
    this.value = convertTransferValue(symbol, value);
    this.gasFee = gasFee;
    this.privateKey = privateKey;
    this.data = data;
    this.rawTransaction = null;
    this.signedTransaction = null;
  }

  async processRawTransaction() {
    console.log('Transaction.processRawTransaction start');
    let result = null;
    const {
      symbol, netType, sender, receiver, value, data, gasFee,
    } = this;
    try {
      const param = createRawTransactionParam({
        symbol, netType, sender, receiver, value, data, gasFee,
      });
      console.log(`Transaction.processRawTransaction, rawTransactionParams: ${JSON.stringify(param)}`);
      result = await Parse.Cloud.run('createRawTransaction', param);
    } catch (e) {
      console.log('Transaction.processRawTransaction err: ', e.message);
      throw e;
    }
    console.log(`Transaction.processRawTransaction finished, result: ${JSON.stringify(result)}`);
    this.rawTransaction = result;
  }

  async signTransaction() {
    console.log('Transaction.signTransaction start');
    let result = null;
    if (this.rawTransaction) {
      const { symbol, rawTransaction, privateKey } = this;
      try {
        result = createSignedTransaction(symbol, rawTransaction, privateKey);
      } catch (e) {
        console.log('Transaction.signTransaction err: ', e.message);
        throw e;
      }
      console.log(`Transaction.processRawTransaction finished, result: ${JSON.stringify(result)}`);
      this.signedTransaction = result;
    } else {
      throw new Error('Transaction.signTransaction err: this.rawTransaction is null');
    }
  }

  async processSignedTransaction() {
    console.log('Transaction.processSignedTransaction start');
    let result = null;
    if (this.signedTransaction) {
      try {
        const param = createSendSignedTransactionParam(this.symbol, this.signedTransaction, this.netType, this.gasFee);
        result = await Parse.Cloud.run('sendSignedTransaction', param);
      } catch (e) {
        console.log('Transaction.processSignedTransaction err: ', e.message);
        throw e;
      }
    } else {
      throw new Error('Transaction.processSignedTransaction err: this.signedTransaction is null');
    }
    console.log(`Transaction.processSignedTransaction finished, result: ${JSON.stringify(result)}`);
    return result;
  }
}

export default Transaction;
