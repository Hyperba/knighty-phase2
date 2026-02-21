import styles from './page.module.css'
import MainButton from '@/components/ui/MainButton/MainButton'
import CTASection from '@/components/sections/CTASection/CTASection'

export default function About() {
  return (
    <main className={styles.about}>
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>About us</p>
          <h1 className={styles.title}>PREMIUM MINECRAFT BUILDS</h1>
        </div>
      </section>

      <section className={styles.minecraftSection}>
        <div className={styles.minecraftContent}>
          <div className={styles.minecraftText}>
            <h2 className={styles.sectionTitle}>WHAT IS MINECRAFT?</h2>
            <p className={styles.minecraftDescription}>
              Minecraft is the world's best-selling video game, played by over 140 million people every month. It's a 3D sandbox game where players can explore, build, and create anything they imagine using digital blocks. Because of its flexibility, Minecraft is used not only for entertainment but also for education, design, and even professional showcases, making it one of the most versatile and creative platforms in gaming.
            </p>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3 className={styles.statLabel}>CREATED</h3>
                <p className={styles.statValue}>2009</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statLabel}>COPIES SOLD</h3>
                <p className={styles.statValue}>310+ Million</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statLabel}>REVENUE</h3>
                <p className={styles.statValue}>$10+ Billion</p>
              </div>
            </div>
          </div>
          <div className={styles.minecraftImage}>
            <img src="/about-image.png" alt="Minecraft Build by Knighty" />
          </div>
        </div>
      </section>

      <section className={styles.storySection}>
        <div className={styles.storyContent}>
          <div className={styles.storyImage}>
            <img src="/knighty-laptop.png" alt="Knighty's Workspace" />
          </div>
          <div className={styles.storyTimeline}>
            <h2 className={styles.sectionTitle}>KNIGHTY'S STORY</h2>
            <div className={styles.timelineList}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2016</div>
                <div className={styles.timelineContent}>
                  <h3 className={styles.timelineTitle}>Discovered Minecraft</h3>
                  <p className={styles.timelineDescription}>
                    I started out playing Minecraft after getting it from a school friend on a USB stick, spent most of the time building Pokemon pixel arts. I was very inspired by people building real life attractions 1:1 scale in Minecraft.
                  </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2021</div>
                <div className={styles.timelineContent}>
                  <h3 className={styles.timelineTitle}>New Beginning</h3>
                  <p className={styles.timelineDescription}>
                    I had really started getting into it when I bought my own account in 2021, starting my very first server world, and playing build battle on Hypixel, which I had wanted to play ever since I had seen it.
                  </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2023</div>
                <div className={styles.timelineContent}>
                  <h3 className={styles.timelineTitle}>Knightybuilds Was Created</h3>
                  <p className={styles.timelineDescription}>
                    After thousands of games in build battle, and countless hours in housing, I discovered building servers. I began learning how to use building tools, and created my social media accounts.
                  </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineYear}>2025</div>
                <div className={styles.timelineContent}>
                  <h3 className={styles.timelineTitle}>The Breakthrough Year</h3>
                  <p className={styles.timelineDescription}>
                    After years of refining my craft, 2025 became a huge turning point. Growth became exponential across platforms, I had won numerous competitions, and finally started seeing my work pay off. This was no longer just a passion project, but a full-time creative career.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <h2 className={styles.sectionTitle}>WHY CHOOSE KNIGHTY</h2>
        <div className={styles.featureGrid}>
          <div 
            className={styles.featureCard}
            style={{ backgroundImage: 'url(/craftsmanship.png)' }}
          >
            <div className={styles.featureContent}>
              <h3 className={styles.featureTitle}>Craftsmanship</h3>
              <p className={styles.featureDescription}>
                Each build is crafted with meticulous attention to detail, combining technical expertise with artistic vision to deliver truly premium results.
              </p>
            </div>
          </div>

          <div 
            className={styles.featureCard}
            style={{ backgroundImage: 'url(/innovation.png)' }}
          >
            <div className={styles.featureContent}>
              <h3 className={styles.featureTitle}>Innovation</h3>
              <p className={styles.featureDescription}>
                Constantly pushing the limits of what&apos;s possible in Minecraft, exploring new techniques and creative solutions that redefine what building can be.
              </p>
            </div>
          </div>

          <div 
            className={styles.featureCard}
            style={{ backgroundImage: 'url(/efficiency.png)' }}
          >
            <div className={styles.featureContent}>
              <h3 className={styles.featureTitle}>Efficiency</h3>
              <p className={styles.featureDescription}>
                Years of experience, mastery of tools, and a vast library of assets ensure fast, reliable delivery, without ever compromising on quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  )
}
