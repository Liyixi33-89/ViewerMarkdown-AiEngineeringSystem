# MD Viewer 鈥?Markdown 鏂囨。棰勮闂ㄦ埛 + 鍚庡彴绠＄悊绯荤粺

鍓嶅彴绾彧璇婚瑙堥棬鎴凤紙PC + 绉诲姩绔級+ 鍚庡彴绠＄悊涓績锛堜笂浼?缁勭粐鏂囨。锛夈€傚墠鍚庣鍒嗙銆?
## 鏂囨。

- `docs/PRD.md` 鈥?浜у搧闇€姹傦紙v1.3锛?- `docs/鎶€鏈璁℃枃妗?md` 鈥?鏋舵瀯銆丄PI銆佹暟鎹簱璁捐锛坴1.0锛?- `AGENTS.md` 鈥?AI 鍗忎綔瑙勮寖锛堟妧鏈爤/鏉冮檺鍒嗙骇/缂栫爜瑙勮寖/楠岃瘉闂幆锛?- `.agent/` 鈥?AI 宸ョ▼浣撶郴锛坰pecs 浠诲姟瑙勮寖 / skills 鍥哄寲缁忛獙锛?
## 鐩綍

```text
frontend/   React 18 + Vite + TS锛堝墠鍙?/ + 鍚庡彴 /admin 鍙岃矾鐢卞煙锛?backend/    Java 17 + Spring Boot 3锛坧ortal 鍏紑鍙 + admin 閴存潈绠＄悊锛?sql/        寤鸿〃鑴氭湰
scripts/    缁熶竴楠岃瘉鍏ュ彛
docs/       鍩虹嚎鏂囨。锛堝喕缁擄級
.agent/     AI 宸ョ▼浣撶郴
```

## 蹇€熷惎鍔?
```powershell
# 1. 鏁版嵁搴擄細MySQL 8 鎵ц sql/init.sql锛堥粯璁ゅ簱鍚?md_viewer锛?# 2. 鍚庣锛?cd backend
# 淇敼 application.yml 涓暟鎹簱杩炴帴
mvn spring-boot:run            # http://localhost:8090  鎺ュ彛鏂囨。 /doc.html
# 3. 鍓嶇锛?cd frontend
npm install
npm run dev                    # http://localhost:5173  浠ｇ悊 /api 鈫?8090
# 4. 榛樿绠＄悊鍛橈細admin / admin123锛堥娆″惎鍔ㄥ悗璇蜂慨鏀瑰瘑鐮侊級
```

## 楠岃瘉

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -Scope quick|commit|ci
```

