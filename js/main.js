// ===== A minta játék indítása a közös vázon =====
import { startShell } from "./shell/index.js";
import { GAME } from "./game/config.js";
import { PACK } from "./pack/index.js";
startShell({ game: GAME, pack: PACK });
