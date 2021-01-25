from pymongo import MongoClient

class MongoSample(object):

    def __init__(self, name):
        self.client = MongoClient()
        self.db = self.client[name] #DB名を設定

    def collection_names(self):
        return self.db.collection_names()

mongo = MongoSample('test')
print(mongo.collection_names())
