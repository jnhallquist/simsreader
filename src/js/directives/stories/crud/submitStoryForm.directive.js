app.directive('submitStoryForm', ['$mdDialog', 'Notification', '$http', 'locationService', '$location', function($mdDialog, Notification, $http, locationService, $location) {
  return {
    restrict: 'A',
    link: function($scope, ele, attr) {
      $scope.submitForm = function(form) {
        if (!form.$valid) return;

        $http({
          method: 'POST',
          url: locationService.origin + '/createStory',
          data: {title: form.Title.$modelValue, description: form.Description.$modelValue, age_restricted: form.Age_Restricted.$modelValue || false},
          withCredentials: true
        })
        .then(function(res) {
          if (res.data && res.data.items) {
            $mdDialog.cancel();
            Notification.success(res.data.msg);
            $location.path('/manageChapters');
          } else {
            Notification.error(res.data.msg);
          }
        });
      };
    }
  };
}]);
