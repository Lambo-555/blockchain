import { Injectable } from '@nestjs/common';
import axios from 'axios';
import RateLimit from 'axios-rate-limit';
import { API_KEY, API_RATE_LIMIT, BLOCKS_COUNT } from './constants/constants';
import { Trx } from './interfaces/transaction.interface';

@Injectable()
export class AppService {
  private http = RateLimit(axios.create(), {
    maxRPS: API_RATE_LIMIT,
  });

  async getLastBlockNumber(): Promise<number> {
    const res = await this.http('https://api.etherscan.io/api', {
      params: {
        module: 'proxy',
        action: 'eth_blockNumber',
        apikey: API_KEY,
      },
    });
    return parseInt(res.data.result, 16);
  }

  async getBlockTrxList(blockNumber: number): Promise<Trx[]> {
    const res = await this.http('https://api.etherscan.io/api', {
      params: {
        module: 'proxy',
        action: 'eth_getBlockByNumber',
        tag: `0x${blockNumber.toString(16)}`,
        boolean: true,
        apikey: API_KEY,
      },
    });
    console.log(JSON.stringify(res.data.result.transactions, null, 2));
    return res.data.result.transactions;
  }

  async getMaxBalanceChangeAddress(): Promise<string> {
    try {
      const lastBlock: number = await this.getLastBlockNumber();
      const balanceChanges: { [address: string]: number } = {};
      for (
        let blockNum = lastBlock;
        blockNum > lastBlock - BLOCKS_COUNT;
        blockNum--
      ) {
        const blockTrxList: Trx[] = await this.getBlockTrxList(blockNum);
        for (const trx of blockTrxList) {
          // получаем плату за газ и комиссии
          const gasPrice = parseInt(trx.gasPrice, 16);
          const gasUsed = parseInt(trx.gasUsed, 16);
          const gasCost = gasPrice * gasUsed;
          const value = parseInt(trx.value, 16);
          const trxValue = value - gasCost;
          // при отправке вычитаем сумму перевода
          if (trx.from) {
            balanceChanges[trx.from] =
              (balanceChanges[trx.from] || 0) - trxValue;
          }
          // при поступлении вычитаем сумму перевода
          if (trx.to) {
            balanceChanges[trx.to] = (balanceChanges[trx.to] || 0) + trxValue;
          }
        }
      }
      let maxBalanceChangeAddress = '';
      let maxBalanceChange = 0;
      for (const [address, balanceChange] of Object.entries(balanceChanges)) {
        const absBalanceChange = Math.abs(balanceChange);
        if (absBalanceChange > maxBalanceChange) {
          maxBalanceChange = absBalanceChange;
          maxBalanceChangeAddress = address;
        }
      }
      return maxBalanceChangeAddress;
    } catch (error) {
      console.error(error);
      return error;
    }
  }
}
