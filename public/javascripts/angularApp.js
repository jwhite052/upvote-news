// Services

angular.module('upvoteNews', ['ui.router'])
.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
        postPromise: ['posts', function(posts){
          return posts.getAll();
        }]
      }
    })
    .state('posts', {
      url: '/posts/{id}',
      templateUrl: '/posts.html',
      controller: 'PostsCtrl',
      resolve: {
        post: ['$stateParams', 'posts', function($stateParams, posts) {
          return posts.get($stateParams.id);
        }]
      }
    })
    .state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    })
    .state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    })
    .state('user', {
      url: '/user',
      templateUrl: '/user.html',
      controller: 'UserProfileCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(!auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    });

  $urlRouterProvider.otherwise('home');
}])
.factory('posts', ['$http', 'auth', function($http, auth){
  var o = {
    posts: []
  };

  o.get = function(id) {
    return $http.get('/posts/' + id).then(function(res){
      return res.data;
    });
  };

  o.getAll = function() {
    return $http.get('/posts').success(function(data){
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
    return $http.post('/posts', post, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      o.posts.push(data);
    });
  };

  o.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      post.upvotes += 1;
    });
  };

  o.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    });
  };

  o.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      comment.upvotes += 1;
    });
  };

  return o;
}])
.factory('auth', ['$http', '$window', '$rootScope', function($http, $window, $rootScope){
   var auth = {
    saveToken: function (token){
      $window.localStorage['upvote-news-token'] = token;
    },
    getToken: function (){
      return $window.localStorage['upvote-news-token'];
    },
    isLoggedIn: function(){
      console.log('Logged in: ');
      var token = auth.getToken();
      //console.log("Token:" + token);
      if(token){
        console.log('TRUE');
        var payload = JSON.parse($window.atob(token.split('.')[1]));
        // console.log("Payload: ");
        // console.log(payload.exp);
        // console.log(Date.now() / 1000);
        // console.log(payload.exp > Date.now() / 1000);
        return payload.exp > Date.now() / 1000;
      } else {
        console.log('FALSE');
        return false;
      }
    },
    currentUser: function(){
      if(auth.isLoggedIn()){
        var token = auth.getToken();
        var payload = JSON.parse($window.atob(token.split('.')[1]));

        return payload.username;
      }
    },
    register: function(user){
      return $http.post('/register', user).success(function(data){
        auth.saveToken(data.token);
      });
    },
    logIn: function(user){
      return $http.post('/login', user).success(function(data){
        auth.saveToken(data.token);
      });
    },
    logOut: function(){
      $window.localStorage.removeItem('upvote-news-token');
    },
    saveProfile: function(user){
      return $http.post('/user', user).success(function(data){
        console.log("Save user profile");
      });
    }
  };

  return auth;
}])
.controller('MainCtrl', [
'$scope',
'posts',
'auth',
function($scope, posts, auth){
  $scope.posts = posts.posts;
  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.addPost = function(){
    if($scope.title === '' || $scope.title === null || $scope.title === undefined) { return; }
    posts.create({
      title: $scope.title,
      link: $scope.link
    });
    $scope.title = '';
    $scope.link = '';
  };

  $scope.incrementUpvotes = function(post) {
    posts.upvote(post);
  };

}])
.controller('PostsCtrl', [
'$scope',
'posts',
'post',
'auth',
function($scope, posts, post, auth){
  $scope.post = post;
  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.addComment = function(){
    if($scope.body === '' || $scope.body === null || $scope.body === undefined) { return; }

    posts.addComment(post._id, {
      body: $scope.body,
      author: auth.currentUser()
    }).success(function(comment) {
      $scope.post.comments.push(comment);
    });

    $scope.body = '';
  };

  $scope.incrementUpvotes = function(comment){
    posts.upvoteComment(post, comment);
  };
}])
.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.saveProfile = function(){
    auth.saveProfile($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}])
.controller('NavCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = function() {
    auth.logOut();
    $state.go('home'); // redirect home
  };
}])
.controller('UserProfileCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = function() {
    auth.logOut();
    $state.reload(); // reload page
  };
}]);
