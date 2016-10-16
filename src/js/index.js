var app = angular.module('simsReader', [
  'ngFileUpload',
  'ngRoute',
  angularDragula(angular),
  'templateCache',
  'ui-notification',
  'ngMaterial'
]);

app.config(['$routeProvider', '$locationProvider', 'NotificationProvider', '$mdIconProvider', '$mdThemingProvider', function($routeProvider, $locationProvider, NotificationProvider, $mdIconProvider, $mdThemingProvider) {
  $routeProvider
    .when('/', {
      templateUrl : 'views/homeView.html',
      controller : 'mainController'
    })
    .when('/home', {
      templateUrl : 'views/homeView.html',
      controller : 'mainController'
    })
    .when('/register', {
      templateUrl : 'views/registerView.html',
      controller : 'registerController'
    })
    .when('/manageStories', {
      templateUrl : 'views/manageStoriesView.html',
      controller : 'createStoryController'
    })
    .when('/viewStory', {
      templateUrl : 'views/viewStoryView.html',
      controller : 'storyController'
    })
    .when('/user', {
      templateUrl : 'views/userView.html',
      controller : 'panelController'
    })
    .when('/verify/:verification_token', {
      templateUrl : 'views/regconfView.html',
      controller : 'emailVerController'
    })
    .when('/forgotPassword', {
      templateUrl : 'views/forgotPasswordView.html',
      controller : 'forgotPasswordController',
      isLoggedOut: true
    })
    .when('/resetPassword/:passwordToken', {
      templateUrl : 'views/resetPasswordView.html',
      controller : 'resetPasswordController',
      isLoggedOut: true
    })
    .otherwise({
      redirectTo: '/'
    });

    NotificationProvider.setOptions({
        delay: 10000,
        startTop: 20,
        startRight: 10,
        verticalSpacing: 20,
        horizontalSpacing: 20,
        positionX: 'right',
        positionY: 'bottom'
    });

  $locationProvider.html5Mode(true);

  $mdIconProvider.defaultIconSet('/fonts/mdi.svg');

  $mdThemingProvider.theme('default')
    .primaryPalette('blue')
    .accentPalette('pink');
}]);

app.run(function($templateRequest){
  // Pre-fetch icons sources by URL and cache in the $templateCache...
  // subsequent $templateRequest calls will look there first.

  let urls = [ '/fonts/mdi.svg'];

  angular.forEach(urls, function(url) {
    $templateRequest(url);
  });
});

app.run(['userService', '$rootScope', '$location', function(userService, $rootScope, $location) {

  userService.getIsLoggedIn()
  .then(function(res) {
    if (res) {
      userService.getUser();
    }

    $rootScope.$on("$routeChangeStart", function(event, next, current) {
      if(next.isLoggedOut && userService.isloggedin()) {
          event.preventDefault();
      }

      // if we want them to be logged in AND they are logged out, prevent controller load
      if(next.isLoggedIn && !userService.isloggedin()) {
          event.preventDefault();
      }
    });
  });
}]);