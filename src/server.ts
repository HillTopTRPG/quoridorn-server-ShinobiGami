import * as path from "path";
import bootUp, {
  ServerSetting,
  MinioSetting,
  InsertFunc,
  UpdateFunc,
  DeleteFunc,
  SocketApiResistInfo,
  readYaml,
  getTargetClient
} from "quoridorn-server-lib";

const serverSetting: ServerSetting = readYaml(path.resolve(__dirname, "../config/server.yaml"));
const minioSetting: MinioSetting = readYaml(path.resolve(__dirname, "../config/minio.yaml"));

console.log(JSON.stringify(serverSetting, null, "  "));
console.log(JSON.stringify(minioSetting, null, "  "));

async function main(): Promise<void> {
  try {
    await bootUp(
      serverSetting,
      minioSetting,
      await getTargetClient(process, "src/interoperability.yaml"),
      "ShinobiGami",
      "./config/log4js_setting.json",
      path.resolve(__dirname, "../message/termsOfUse.txt"),
      path.resolve(__dirname, "../message/message.yaml"),
      new Map<string, InsertFunc>(),
      new Map<string, DeleteFunc>(),
      new Map<string, UpdateFunc>(),
      new Map<string, SocketApiResistInfo>(),
      []
    );
  } catch (err) {
    console.error("====================");
    console.error("Server boot failed.");
    console.error(err);
  }
}

main().then();
