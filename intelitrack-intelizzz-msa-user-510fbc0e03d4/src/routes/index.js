const Router = require('koa-router');
const GroupController = require('../controllers/groups.controller');
const UserController = require('../controllers/users.controller');
const UserGroupsController = require('../controllers/user-groups.controller');

const RootRouter = new Router();

// Groups
RootRouter.get('/groups/count/:jwtdata', GroupController.groupsCount);
RootRouter.get('/users/groups/:userId', UserController.userGroups);
RootRouter.get('/groups/:jwtdata', GroupController.getGroups);

RootRouter.post('/group/:accountId', GroupController.createGroup);
RootRouter.put('/group/:accountId', GroupController.updateGroup);

// User
RootRouter.get('/user/:jwtdata', UserController.getUser);
RootRouter.get('/user/children/:jwtdata', UserController.getChildren);
RootRouter.put('/user/update/:jwtdata', UserController.updateUser);

// Registration
RootRouter.get('/user/token/:token', UserController.getTokenData);
RootRouter.put('/user/accept', UserController.acceptChildInvite);

RootRouter.post('/users/auth', UserController.authenticate);
RootRouter.post('/user/register', UserController.createNewUser);
RootRouter.post('/user/child/:jwtdata', UserController.createChildUser);

// User Groups
RootRouter.post('/usergroup/:accountId', UserGroupsController.addUserGroup);
RootRouter.get('/usergroup/:userId/:accountId', UserGroupsController.getGroups);

module.exports = RootRouter;

