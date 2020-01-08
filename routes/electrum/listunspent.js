const electrumJSCore = require('./electrumjs.core.js');

module.exports = (api) => {
  api.get('/listunspent', (req, res, next) => {
    if (api.checkServerData(req.query, res)) {
      (async function() {
        const ecl = new electrumJSCore(req.query.port, req.query.ip, req.query.proto || 'tcp');
        const verbose = req.query.verbose && req.query.verbose === 'true' ? true : false;

        ecl.connect();
        api.addElectrumConnection(ecl);
        
        if (await api.serverVersion(ecl, res, req.query.eprotocol) === true) {
          ecl.blockchainAddressListunspent(req.query.address)
          .then((json) => {
            if (!verbose) {
              ecl.close();
              
              const successObj = {
                msg: json.code ? 'error' : 'success',
                result: json,
              };

              res.set({ 'Content-Type': 'application/json' });
              res.end(JSON.stringify(successObj));
            } else {
              if (json.code) {
                ecl.close();

                const successObj = {
                  msg: json.code ? 'error' : 'success',
                  result: json,
                };

                res.end(JSON.stringify(successObj));
              } else {
                if (json &&
                    json.length) {
                  Promise.all(json.map((transaction, index) => {
                    return new Promise((resolve, reject) => {
                      ecl.blockchainTransactionGet(transaction.tx_hash, true)
                      .then((verboseTx) => {
                        if (verboseTx.hasOwnProperty('hex')) {
                          json[index].verbose = verboseTx;
                        }

                        resolve(true);
                      });
                    });
                  }))
                  .then(promiseResult => {
                    ecl.close();

                    const successObj = {
                      msg: 'success',
                      result: json,
                    };

                    res.set({ 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(successObj));
                  });
                } else {
                  ecl.close();

                  const successObj = {
                    msg: 'success',
                    result: [],
                  };

                  res.set({ 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(successObj));
                }
              }
            }
          });
        }
      })();
    }
  });

  return api;
};