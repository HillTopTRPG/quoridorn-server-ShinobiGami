import Driver from "nekostore/lib/Driver";
import {addDirect} from "../event/add-direct";
import {getOwner, resistCollectionName, splitCollectionName} from "./collection";
import {addSimple, deleteSimple} from "./data";
import {addActorGroup, deleteActorGroup} from "./data-actor-group";
import {procAsyncSplit} from "./async";
import DocumentSnapshot from "nekostore/lib/DocumentSnapshot";

export async function addActorRelation(
  driver: Driver,
  socket: any,
  collectionName: string,
  data: Partial<StoreData<ActorStore>> & { data: ActorStore }
): Promise<DocumentSnapshot<StoreData<ActorStore>> | null> {
  const {roomCollectionPrefix} = splitCollectionName(collectionName);

  const doc = await addSimple(driver, socket, collectionName, data);
  if (!doc) return null;

  const actorKey = doc.data!.key;

  // アクターグループ「All」に追加
  const owner = await getOwner(driver, socket.id, data.owner || undefined);
  await addActorGroup(driver, roomCollectionPrefix, "All", actorKey, "actor", owner);

  // ステータスを自動追加
  const statusCollectionName = `${roomCollectionPrefix}-DATA-status-list`;
  data.data.statusKey = (await addSimple<ActorStatusStore>(
    driver,
    socket,
    statusCollectionName,
    {
      ownerType: "actor-list",
      owner: actorKey,
      data: { name: "◆", isSystem: true, standImageKey: null }
    }
  ))!.data!.key;
  await resistCollectionName(driver, statusCollectionName);

  await doc.ref.update({
    status: "modified",
    data: data.data,
    updateTime: new Date()
  });

  // リソースを自動追加
  const resourceMasterCCName = `${roomCollectionPrefix}-DATA-resource-master-list`;
  const resourceMasterCC = driver.collection<StoreData<ResourceMasterStore>>(resourceMasterCCName);
  const resourceMasterDocList = (await resourceMasterCC.where("data.isAutoAddActor", "==", true).get()).docs;

  // リソースインスタンスを追加
  await addDirect<ResourceStore>(driver, socket, {
    collection: `${roomCollectionPrefix}-DATA-resource-list`,
    list: resourceMasterDocList.map(rmDoc => ({
      ownerType: "actor-list",
      owner: actorKey,
      order: -1,
      data: {
        resourceMasterKey: rmDoc.data!.key,
        type: rmDoc.data!.data!.type,
        value: rmDoc.data!.data!.defaultValue
      }
    }))
  }, false);

  return doc;
}

export async function deleteActorRelation(
  driver: Driver,
  socket: any,
  collectionName: string,
  actorKey: string
): Promise<void> {
  const roomCollectionPrefix = collectionName.replace(/-DATA-.+$/, "");

  // アクターグループ「All」から削除
  await deleteActorGroup(driver, roomCollectionPrefix, "All", actorKey);

  // ステータスを強制的に削除
  const statusCollectionName = `${roomCollectionPrefix}-DATA-status-list`;
  const statusColumnCC = driver.collection<ActorStatusStore>(statusCollectionName);
  await procAsyncSplit(
    (await statusColumnCC.where("owner", "==", actorKey).get())
    .docs
    .map(doc => doc.ref.delete())
  );

  // リソースを強制的に削除
  const resourceCC = driver.collection<ResourceStore>(`${roomCollectionPrefix}-DATA-resource-list`);
  await procAsyncSplit(
    (await resourceCC.where("owner", "==", actorKey).get())
    .docs
    .map(doc => doc.ref.delete())
  );

  // 最後に本体を削除
  await deleteSimple(driver, socket, collectionName, actorKey);
}
