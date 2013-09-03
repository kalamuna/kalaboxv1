# Installing Kalabox
=========================
Before installing, please check the Requirements (listed below).

1. Double click on the installer.
2. Agree to the terms of service.
3. Rejoice.

NOTE: Apple may warn you that Kalabox is "from an unidentified developer." That's because we're hip with the indie crowd. To get around the warning (until we sell our souls to Apple), either right-click on Kalabox and select "Open," or, if you're tired of Apple's bullshit, follow these directions to disable Gatekeeper.

## Requirements

1. Mac OSX 10.7+

  Kalabox has been tested mostly on Mac OS X 10.8 and partially tested on 10.7. It may work on 10.6 or lower. If you try it out on an older OS X version, please share your experience.

2. 64-bit architecture

  For now, Kalabox supports 64-bit operating systems only. So if you're on a 32-bit machine, just hang tight, as support is coming soon!

3. Vagrant 1.2.2 and VirtualBox 4.2.8

  Kalabox needs Vagrant 1.2.2 and VirtualBox 4.2.8 to run. It will install them for you if you don't have them, or upgrade them for you if you're on an older versions.

4. 1GB+ of RAM

  Kalabox dynamically allocates memory to itself based on your available RAM. It needs at least 1GB available to run.

## Known Issues

The Mac OS X firewall can interfere with the underlying technologies, Vagrant and NFS, that Kalabox uses. Check out these instructions for tips on using Kalabox with your firewall. Please refer to:
https://kalamuna.atlassian.net/wiki/display/kalabox/Troubleshooting+Kalabox+Problems

## Connecting with Pantheon

Kalabox can connect to Pantheon and download sites you have on your Pantheon account. To download a site from Pantheon, follow these steps: Download your site aliases by visiting "Your Sites" on Pantheon and clicking the "Download all Drush aliases" button.

In Kalabox, go to the Configure tab and drag-and-drop the site aliases file you downloaded to the upload widget.

Make sure that you have an SSH key that's connected to your Pantheon account on your computer in your home directory's .ssh folder. If you don't Kalabox will generate one for you and you'll need to add it to your Pantheon account. See: http://helpdesk.getpantheon.com/customer/portal/articles/361246-loading-ssh-keys

Go to the "My Sites" tab in Kalabox and download away! If your sites don't appear, try restarting Kalabox.

If you're interested in interacting with your Pantheon sites directly from the command line, you can use some of the handy Drush commands that come packaged with Kalastack.
https://github.com/kalamuna/kalastack

## Troubleshooting Installation

If you installation fails you should report the failure to errors@kalamuna.com. You might also want to check out the Uninstall.tool utility that is packaged with the install DMG. THIS UTILITY CAN WIPE BOTH YOUR VIRTUAL BOX AND VAGRANT INSTALLS, INCLUDING PREVIOUSLY BUILT VMS. AKA BE CAREFUL.

## More?

https://kalamuna.atlassian.net/wiki/display/kalabox/Kalabox+Home
