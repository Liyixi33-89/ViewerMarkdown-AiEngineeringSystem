# .agent/ 鈥?AI 宸ョ▼浣撶郴

鏈洰褰曟槸椤圭洰鐨?"AI 寮€鍙戞搷浣滅郴缁?锛氫笂涓嬫枃銆佽鑼冦€佺粡楠屻€侀獙璇佺殑缁熶竴鍏ュ彛銆?
## 鐩綍缁撴瀯

```text
.agent/
鈹溾攢鈹€ README.md            # 鏈枃浠讹細鍚姩鏂瑰紡銆佸畨鍏ㄨ竟鐣?鈹溾攢鈹€ specs/               # 闇€姹傝鑼冿紙姣忛渶姹備竴鐩綍锛宻pec-kit 椋庢牸锛?鈹?  鈹溾攢鈹€ _template/       # 鏂伴渶姹傛ā鏉匡細spec.md / tasks.md / acceptance.md
鈹?  鈹斺攢鈹€ M1-鏍稿績鍙敤/     # 褰撳墠娲昏穬锛歴pec锛堢洰鏍囧绾︼級/ tasks锛堣繘搴︼級/ acceptance锛堥獙鏀讹級
鈹斺攢鈹€ skills/              # 鍥哄寲鐨勫彲澶嶇敤缁忛獙锛圓gent Skills 鏍囧噯鏍煎紡锛?    鈹溾攢鈹€ _template/       # 鏂板缓 skill 妯℃澘锛圫KILL.md 鍚?YAML frontmatter锛?    鈹溾攢鈹€ add-portal-page/
    鈹溾攢鈹€ add-admin-api/
    鈹斺攢鈹€ verify-workflow/
```

## 鏍煎紡绾﹀畾锛堝榻愬紑婧愭爣鍑嗭級

- **skills**锛氭瘡涓?skill 涓€涓洰褰曪紝鍐呭惈 `SKILL.md`锛屾枃浠跺ご涓?YAML frontmatter锛坄name` + `description`锛夛紝description 鍐欐槑瑙﹀彂鍦烘櫙涓庢绱㈠叧閿瘝 鈥斺€?鍏煎 Anthropic Agent Skills 瑙勮寖锛屽彲琚?Claude Code / Cursor 绛夊伐鍏疯嚜鍔ㄥ彂鐜般€?- **specs**锛氶噰鐢?spec-kit 椋庢牸涓変欢濂?鈥斺€?`spec.md`锛堢洰鏍?鑼冨洿/濂戠害锛夈€乣tasks.md`锛坈heckbox 杩涘害锛夈€乣acceptance.md`锛堥獙鏀舵爣鍑嗭紝鍚汉宸ラ獙鏀堕」锛夈€?
## 蹇€熶笂鎵嬶紙缁?Agent 鐨勫惎鍔ㄦ寚浠わ級

1. 璇绘牴鐩綍 `AGENTS.md`锛堟妧鏈爤銆佺洰褰曡亴璐ｃ€佹潈闄愬垎绾с€佺紪鐮佽鑼冿級銆?2. 璇?`.agent/specs/` 涓笌褰撳墠浠诲姟瀵瑰簲鐨?spec 鐩綍锛堟寜鐩綍鍚嶅尮閰嶏級銆?3. 闇€瑕佸鐢ㄧ粡楠屾椂鎸?frontmatter description 妫€绱?`.agent/skills/`銆?4. 瀹屾垚鏀瑰姩鍚庢墽琛?`scripts/verify.ps1 -Scope quick|commit|ci`銆?5. 韪╁潙鍚庢寜 `_template` 鏂板缓鎴栨洿鏂板搴?skill锛堜箟鍔★級銆?
## 瀹夊叏杈圭晫锛堢姝?AI 淇敼锛?
- `docs/`锛圥RD 涓庢妧鏈璁′负鍐荤粨鍩虹嚎锛屽彉鏇撮渶浜虹被纭锛?- `.agent/specs/` 涓爣璁?`[FROZEN]` 鐨勮鑼?- `sql/init.sql`銆乣pom.xml`銆乣package.json`銆乣tsconfig.json`銆乣.gitignore`
- 浠讳綍鍒犻櫎鎿嶄綔銆佺敓浜ч厤缃€佸瘑閽ユ枃浠?
## 瀹炴椂鐘舵€佷粠鍝噷璇伙紙涓嶈鍐欒繘鏂囨。锛?
| 淇℃伅 | 鏉ユ簮 |
| --- | --- |
| 鐩綍鏍?璺敱 | 浠ｇ爜鏈韩锛坄frontend/src/routes/`銆乣backend/**/controller/`锛?|
| DB Schema | `sql/init.sql` |
| API 濂戠害 | `docs/鎶€鏈璁℃枃妗?md` 3.3 鑺?+ 杩愯鏃?`/doc.html`锛圫pringDoc锛?|
| 褰撳墠杩涘害 | `specs/<闇€姹傚悕>/tasks.md` 鐨?checkbox |

