var inquirer = require("inquirer");

function d(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

const is20 = (r) => r === 20;
const is1 = (r) => r === 1;

const critFail = (rolls) => rolls.filter(is20).length === 3;
const fail = (rolls) => rolls.filter(is20).length === 2;

const critSucc = (rolls) => rolls.filter(is1).length === 3;
const succ = (rolls) => rolls.filter(is1).length === 2;

const getQL = (rest) =>
  rest >= 0 ? Math.max(Math.min(Math.ceil(rest / 3), 6), 1) : null;

const signed = (num) => (num < 0 ? "-" : "+") + Math.abs(num);

const getRest = (rolls, attrs, sp, mod, { log = true } = {}) => {
  let rest = sp;
  for (const [index, roll] of rolls.entries()) {
    const attr = attrs[index];
    const modAttr = attr + mod;
    if (roll > modAttr) {
      rest = rest - (roll - modAttr);
      if (rest >= 0) {
        log &&
          console.log(
            `Wurf #${index + 1}: 🎲 ${roll} | 🎯 ${
              mod ? `${attr}${signed(mod)} = ${modAttr}` : attr
            } ▸ ! Nutzt ${roll - modAttr} FP, ${rest} übrig.`
          );
      } else {
        log &&
          console.log(
            `Wurf #${index + 1}: 🎲 ${roll} | 🎯 ${
              mod ? `${attr}${signed(mod)} = ${modAttr}` : attr
            } ▸ ✘ Benötigt ${roll - modAttr} FP, ${Math.abs(rest)} fehlen.`
          );
      }
    } else {
      log &&
        console.log(
          `Wurf #${index + 1}: 🎲 ${roll} | 🎯 ${
            mod ? `${attr}${signed(mod)} = ${modAttr}` : attr
          } ▸ ✔`
        );
    }
  }
  return rest;
};

const log = (rolls, msg) => console.log(msg, "(" + rolls.join(" | ") + ")\n");

function calcChance(attrs, sp, mod) {
  let successCount = 0;
  const qls = [0, 0, 0, 0, 0, 0];

  for (d1 = 1; d1 <= 20; d1++) {
    for (d2 = 1; d2 <= 20; d2++) {
      for (d3 = 1; d3 <= 20; d3++) {
        const rolls = [d1, d2, d3];
        switch (true) {
          case critFail(rolls):
          case fail(rolls):
            continue;

          case critSucc(rolls):
          case succ(rolls):
            qls[getQL(sp) - 1]++;
            successCount++;
            continue;
        }

        const rest = getRest(rolls, attrs, sp, mod, { log: false });
        if (rest >= 0) {
          qls[getQL(rest) - 1]++;
          successCount++;
        }
      }
    }
  }
  return [successCount / 8000, qls.map((ql) => ql / 8000)];
}

function percent(num) {
  return `${Math.round(num * 10000) / 100}%`;
}

(async () => {
  let lastCheck;
  while (true) {
    const { check } = await inquirer.prompt([
      {
        name: "check",
        message: "Check 'A1 A2 A3 FW [+/-MOD]'",
        default: lastCheck,
        validate: (v) => {
          const arr = v.split(" ").map((v) => parseInt(v, 10));
          if (!(arr.length >= 3 || arr.length <= 5))
            return "Bitte 3 bis 5 Werte eingeben.";
          if (arr.some(isNaN)) return "Bitte nur Zahlen eingeben";
          return true;
        },
      },
    ]);
    lastCheck = check;
    const [a1, a2, a3, sp = 0, mod = 0] = check
      .split(" ")
      .map((v) => parseInt(v, 10));
    const attrs = [a1, a2, a3];

    console.log();

    console.time("check");
    const [chance, qls] = calcChance(attrs, sp, mod);
    console.timeEnd("check");
    console.log(`Erfolgschance: ${percent(chance)}`);
    console.log(
      `Erfolgschancen ${qls
        .map((ql, i) => (ql > 0 ? `QS ${i + 1}: ${percent(ql)}` : null))
        .filter(Boolean)
        .join(", ")}`
    );

    rolls = [d(20), d(20), d(20)];
    switch (true) {
      case critFail(rolls):
        log(rolls, "Kritischer Patzer.");
        continue;

      case fail(rolls):
        log(rolls, "Patzer.");
        continue;

      case critSucc(rolls):
        log(rolls, `Glücklicher Erfolg. (QS ${getQL(sp)})`);
        continue;

      case succ(rolls):
        log(rolls, `Kritischer Erfolg. (QS ${getQL(sp)})`);
        continue;
    }

    const rest = getRest(rolls, attrs, sp, mod);

    log(
      rolls,
      rest >= 0
        ? `Geschafft mit QS ${getQL(rest)}. FP übrig: ${rest}`
        : `Nicht geschafft. Es fehlten ${Math.abs(rest)} FP.`
    );
  }
})();
