import $ from 'jquery'

$(document).ready(function() {
  console.log('Video src loaded')
  setTimeout(function() {
    let iframes = $("iframe[data-media-type='video']")

    if (iframes.length > 0) {
      iframes.map(function (i, item){
        let url = item.src
        let id = url.substring(url.lastIndexOf('/files/') + 7).split('/')[0]
        let contains_mediahref = url.substring(url.lastIndexOf('media_objects_iframe?mediahref'))

        if (contains_mediahref.length > 0 && id.length > 0) {
          console.log(id)
          $.ajax({
            url: '/files/' + id + '/public_url/',
            type: 'GET',
            success: (data) => {
              item.src = data['public_url']
            },
            error: () => {},
          })
        }
      })
    }
  }, 2000);
})
