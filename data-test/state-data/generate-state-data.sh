#!/bin/bash
for iteration in {0..91}
do
    state[0]="INIT"
    state[1]="VALIDATED"
    state[2]="EXTRACTED"
    randomIdState=$[ $RANDOM % 3 ]
    randomDate=`shuf -i 1000000000-9000000000 -n 1`
    randomPage=`shuf -i 1-20 -n 1`
    cat template.json | sed -e "s/\${date}/${randomDate}/g" -e "s/\${currentPage}/${randomPage}/g" -e "s/\${state}/${state[$randomIdState]}/g" >> state-data-${iteration}.json
done
