const TaskDao = require("../models/taskDao");
const { EventHubProducerClient } = require("@azure/event-hubs");

const sharedAccessKey = process.env.SHARED_ACCESS_KEY || "[The shared access key of your Event Hub]";
const connectionString = `Endpoint=sb://cidatahub.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=${sharedAccessKey}`;
const eventHubName = "neo";

 class TaskList {
   /**
    * Handles the various APIs for displaying and managing tasks
    * @param {TaskDao} taskDao
    */
   constructor(taskDao) {
     this.taskDao = taskDao;
     this.producer = new EventHubProducerClient(connectionString, eventHubName);
   }
   async showTasks(req, res) {
     const querySpec = {
       query: "SELECT * FROM root r WHERE r.completed=@completed",
       parameters: [
         {
           name: "@completed",
           value: false
         }
       ]
     };

     const items = await this.taskDao.find(querySpec);
     res.render("index", {
       title: "My ToDo List ",
       tasks: items
     });
   }

   async addTask(req, res) {
      const item = req.body;
      await this.taskDao.addItem(item);

      const batch = await this.producer.createBatch();
      batch.tryAdd({ body: item });
      await this.producer.sendBatch(batch);

      res.redirect("/");
   }

   async completeTask(req, res) {
     const completedTasks = Object.keys(req.body);
     const tasks = [];

     completedTasks.forEach(task => {
       tasks.push(this.taskDao.updateItem(task));
     });

     await Promise.all(tasks);

     res.redirect("/");
   }
 }

 module.exports = TaskList;