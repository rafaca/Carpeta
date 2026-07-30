# Regenerating the share image (og-twp.png)

`tools/og-capture.html` mounts the real dancers engine with the launch
preset and the lab studio's low camera (the site's camera looks down at
the ring, which smears the eyes across the top of the head).

    cd public && python3 -m http.server 8099 &
    cp ../tools/og-capture.html _ogcap.html
    chromium --headless=new --use-gl=angle --use-angle=swiftshader \
      --enable-unsafe-swiftshader --force-device-scale-factor=2 \
      --window-size=1200,630 --virtual-time-budget=16000 \
      --screenshot=hi.png http://127.0.0.1:8099/_ogcap.html
    # crop the figure cluster to 1200x630 -> public/assets/img/og-twp.png
    rm _ogcap.html   # must never deploy: public/*.html ships to the site

Chromium ships with Playwright at /opt/pw-browsers/.
