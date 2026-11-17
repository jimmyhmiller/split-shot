function main(ast) {
  return transform(ast, [
    {name: 'constant-fold', exit: constantFold},
    {name: 'strength-reduce', exit: strengthReduce},
    {name: 'remove-identities', exit: removeIdentities}
  ]);
}
