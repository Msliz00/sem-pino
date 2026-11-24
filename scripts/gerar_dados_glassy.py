#!/usr/bin/env python3
# Dados de EXEMPLO — Glassy · Action Forte. Canais: SMS, E-mail, Live, Hacker.
# Por campanha e por dia: [investimento, impressões/envios, cliques, registros, FTD, depósitos, NGR]
import json, random, datetime as dt, sys
random.seed(11)

INICIO = dt.date(2026, 9, 23)
DIAS = 60
OUT = sys.argv[1]

def wk(i):
    d = (INICIO + dt.timedelta(days=i)).weekday()
    return {5: 1.16, 6: 1.12, 2: 1.06, 0: 0.93}.get(d, 1.0)

# tipo: "pago" (custo diário), "live" (custo só em dia de live), "fixo" (custo baixo e estável)
# id, nome, canal, status, ini, fim, tipo, custo/dia, envios/dia, CTR, clique→reg, reg→FTD, ticket, mult.dep, NGR/dep
C = [
 ("sms-boas",   "Disparo de boas-vindas",   "SMS",    "ativa",    0, None, "pago", 2400, 52000, .026, .130, .36,  68, 1.8, .33),
 ("sms-reat",   "Reativação de inativos",   "SMS",    "ativa",    8, None, "pago", 1000, 21000, .021, .070, .48,  78, 2.4, .35),
 ("mail-news",  "Newsletter semanal",       "E-mail", "ativa",    0, None, "fixo",  420,140000, .011, .060, .30,  60, 2.0, .33),
 ("mail-recarga","Bônus de recarga",        "E-mail", "em teste",28, None, "fixo",  380, 90000, .014, .050, .40,  75, 2.2, .30),
 ("live-avi",   "Live Aviator noturna",     "Live",   "ativa",    2, None, "live", 6200, 64000, .060, .120, .40,  90, 2.0, .34),
 ("live-rol",   "Live roleta fim de semana","Live",   "ativa",   12, None, "live", 4800, 48000, .055, .110, .38,  85, 1.9, .33),
 ("hk-avi",     "Hacker Aviator",           "Hacker", "ativa",    0, None, "pago", 2600, 30000, .045, .150, .44,  70, 2.1, .36),
 ("hk-mines",   "Hacker Mines",             "Hacker", "pausada",  0,   36, "pago", 2100, 26000, .030, .080, .30,  55, 1.6, .26),
]

def r2(x): return round(x, 2)

camps = []
for (cid, nome, canal, status, ini, fim, tipo, base, env, ctr, c2r, r2f, tk, dm, nr) in C:
    serie = []
    end = fim if fim is not None else DIAS
    for i in range(DIAS):
        if i < ini or i >= end:
            serie.append([0, 0, 0, 0, 0, 0, 0]); continue
        age = i - ini
        prog = age / max(1, (end - ini - 1))
        f = wk(i) * random.uniform(0.86, 1.14)
        if tipo == "live":
            ao_vivo = (age % 3 == 0) if cid == "live-avi" else ((INICIO + dt.timedelta(days=i)).weekday() in (5, 6))
            inv  = base * (1 + .3 * prog) * random.uniform(.9, 1.1) if ao_vivo else 0
            impr = int(env * random.uniform(.85, 1.2) if ao_vivo else env * random.uniform(.06, .1))
            cli  = int(impr * (ctr if ao_vivo else ctr * .6) * random.uniform(.9, 1.1))
        elif tipo == "fixo":
            inv  = base * random.uniform(.95, 1.05)
            impr = int(env * (1 + .4 * prog) * random.uniform(.9, 1.1))
            cli  = int(impr * ctr * random.uniform(.85, 1.15))
        else:
            inv  = base * (1 + .6 * prog) * f
            impr = int(env * (1 + .6 * prog) * f)
            cli  = int(impr * ctr * random.uniform(.9, 1.1))
        reg = int(cli * c2r * random.uniform(.88, 1.12))
        ftd = int(reg * r2f * random.uniform(.85, 1.15))
        dep = ftd * tk * random.uniform(.88, 1.14) * (dm + 0.012 * age)
        ramp = min(1.0, 0.55 + i / 24)                 # operação nova: bônus pesam no início
        ngr = dep * nr * 0.62 * ramp * random.uniform(.72, 1.28)
        serie.append([r2(inv), impr, cli, reg, ftd, r2(dep), r2(ngr)])
    camps.append({"id": cid, "nome": nome, "canal": canal, "status": status,
                  "inicio": str(INICIO + dt.timedelta(days=ini)),
                  "fim": str(INICIO + dt.timedelta(days=fim - 1)) if fim is not None else None, "d": serie})

data = {"exemplo": True, "inicio": str(INICIO), "dias": DIAS, "atualizado": str(INICIO + dt.timedelta(days=DIAS - 1)),
        "canais": ["SMS", "E-mail", "Live", "Hacker"], "campanhas": camps}
open(OUT, "w", encoding="utf-8").write("window.IG = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")

tot = [0] * 7
for canal in data["canais"]:
    s = [0] * 7
    for c in camps:
        if c["canal"] != canal: continue
        for row in c["d"][30:]:
            s = [a + b for a, b in zip(s, row)]
    tot = [a + b for a, b in zip(tot, s)]
    print(f"  {canal:<7} inv={s[0]:>9.0f} cli={s[2]:>7} reg={s[3]:>6} ftd={s[4]:>5} ngr={s[6]:>9.0f} roi={(s[6]-s[0])/s[0]:+.0%}")
print(f"  GERAL   inv={tot[0]:.0f} ngr={tot[6]:.0f} resultado={tot[6]-tot[0]:.0f} roi={(tot[6]-tot[0])/tot[0]:+.1%}")
